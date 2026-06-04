import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DashboardService } from '../../dashboard/dashboard.service';
import { PayrollStatus, Prisma } from '@prisma/client';
import { calculateNetSalary } from '../calculators/tax.calculator';
import { EthiopianCalendarService } from '../../shared/ethiopian-calendar/ethiopian-calendar.service';

@Injectable()
export class PayrollCalculationService {
  private readonly logger = new Logger(PayrollCalculationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
    private readonly ethiopianCalendarService: EthiopianCalendarService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validates that a period string is in YYYY-MM format.
   * Converts it to a periodStart (1st of month) and periodEnd (last ms of month).
   */
  private parsePeriod(period: string): { periodStart: Date; periodEnd: Date } {
    const re = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!re.test(period)) {
      throw new BadRequestException('Invalid period format. Use YYYY-MM');
    }
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 1) - 1); // last ms of month
    return { periodStart, periodEnd };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 1 – generatePayrollLineForEmployee
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculates and persists a single PayrollLineItem for one employee.
   * Called internally by generateCompletePayrollRun.
   */
  async generatePayrollLineForEmployee(
    payrollRunId: string,
    employeeId: string,
  ) {
    // 1. Fetch employee — only the fields we need (minimal surface area)
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        baseSalary: true,
        firstName: true,
        lastName: true,
        bankAccount: true,
        bankCode: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    // 2. Run Ethiopian tax + pension calculation
    const grossNum = Number(employee.baseSalary);
    const calculated = calculateNetSalary(grossNum);

    // 3. Persist PayrollLineItem
    try {
      const line = await this.prisma.payrollLineItem.create({
        data: {
          payrollRunId,
          employeeId,
          baseSalary:    new Prisma.Decimal(calculated.grossSalary),
          grossSalary:   new Prisma.Decimal(calculated.grossSalary),
          incomeTax:     new Prisma.Decimal(calculated.incomeTax),
          pensionDeduction:           new Prisma.Decimal(calculated.pensionEmployee),
          employerPensionContribution: new Prisma.Decimal(calculated.pensionEmployer),
          netPay:        new Prisma.Decimal(calculated.netSalary),
          bankAccount:   employee.bankAccount ?? null,
          bankCode:      employee.bankCode    ?? null,
          disbursed:     false,
        },
      });
      return { line, calculated };
    } catch (err: any) {
      this.logger.error(`DB error creating payroll line for employee ${employeeId}:`, err);
      throw new InternalServerErrorException(
        `Failed to create payroll line for employee ${employeeId}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 2 – generateCompletePayrollRun
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generates a complete DRAFT payroll run for all ACTIVE employees of a tenant.
   * The entire operation is atomic — no partial writes.
   *
   * @param tenantId  UUID of the requesting tenant
   * @param period    Period in YYYY-MM format (e.g. "2025-01")
   */
  async generateCompletePayrollRun(tenantId: string, period: string) {
    // 1. Validate period
    const { periodStart, periodEnd } = this.parsePeriod(period);

    // 2. Duplicate guard — unique constraint is [tenantId, periodStart, periodEnd]
    const existing = await this.prisma.payrollRun.findFirst({
      where: { tenantId, periodStart, periodEnd },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Payroll already exists for this period');
    }

    // 3. Fetch all ACTIVE employees
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, baseSalary: true, bankAccount: true, bankCode: true },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active employees to generate payroll for');
    }

    // 4. Calculate each employee's payroll line data in memory first
    const linesData = employees.map((emp) => {
      const grossNum = Number(emp.baseSalary);
      const c = calculateNetSalary(grossNum);
      return {
        employeeId:                   emp.id,
        baseSalary:                   new Prisma.Decimal(c.grossSalary),
        grossSalary:                  new Prisma.Decimal(c.grossSalary),
        incomeTax:                    new Prisma.Decimal(c.incomeTax),
        pensionDeduction:             new Prisma.Decimal(c.pensionEmployee),
        employerPensionContribution:  new Prisma.Decimal(c.pensionEmployer),
        netPay:                       new Prisma.Decimal(c.netSalary),
        bankAccount:                  emp.bankAccount ?? null,
        bankCode:                     emp.bankCode    ?? null,
        disbursed:                    false,
        _meta: c, // used for totals, stripped before DB write
      };
    });

    // 5. Aggregate totals
    let grossTotal = new Prisma.Decimal(0);
    let taxTotal   = new Prisma.Decimal(0);
    let netTotal   = new Prisma.Decimal(0);

    for (const l of linesData) {
      grossTotal = grossTotal.add(l.grossSalary);
      taxTotal   = taxTotal.add(l.incomeTax);
      netTotal   = netTotal.add(l.netPay);
    }

    // 6. Strip _meta and build clean createMany payload
    const createManyData = linesData.map(({ _meta: _ignored, ...rest }) => rest);

    // Calculate Ethiopian labels
    const ethDate = this.ethiopianCalendarService.toEthiopian(periodStart);
    const [year, month] = period.split('-');

    // 7. Single atomic transaction — PayrollRun + all PayrollLineItems
    try {
      const payrollRun = await this.prisma.payrollRun.create({
        data: {
          tenantId,
          periodStart,
          periodEnd,
          status:     PayrollStatus.DRAFT,
          totalGross: grossTotal,
          totalTax:   taxTotal,
          totalNet:   netTotal,
          periodLabelEC: `${ethDate.monthName} ${ethDate.year}`,
          periodLabelGC: `${month}/${year}`,
          payrollLineItems: {
            createMany: { data: createManyData },
          },
        },
        include: {
          payrollLineItems: {
            select: {
              id:                          true,
              employeeId:                  true,
              grossSalary:                 true,
              incomeTax:                   true,
              pensionDeduction:            true,
              employerPensionContribution: true,
              netPay:                      true,
              bankCode:                    true,
              disbursed:                   true,
            },
          },
        },
      });

      // 8. Invalidate dashboard payroll cache
      await this.dashboardService.invalidatePayrollCache(tenantId);
      await this.dashboardService.invalidateTenantKPICache(tenantId);

      this.logger.log(
        `PayrollRun ${payrollRun.id} created for tenant ${tenantId} (period: ${period}) ` +
        `with ${employees.length} lines. Gross: ${grossTotal}, Tax: ${taxTotal}, Net: ${netTotal}`,
      );

      return payrollRun;
    } catch (err: any) {
      this.logger.error(`Failed to create payroll run for tenant ${tenantId}:`, err);
      throw new InternalServerErrorException(
        `Payroll generation failed: ${err.message ?? 'Unknown error'}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METHOD 3 – lockPayrollRun
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Transitions a PayrollRun from DRAFT → OWNER_APPROVED (locked, read-only).
   * Once locked the run is ready for disbursement — no further edits permitted.
   *
   * @param payrollRunId  UUID of the PayrollRun to lock
   */
  async lockPayrollRun(payrollRunId: string) {
    // 1. Fetch current status
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      select: { id: true, status: true, tenantId: true },
    });

    if (!run) {
      throw new NotFoundException(`PayrollRun ${payrollRunId} not found`);
    }

    // 2. Guard — only DRAFT runs can be locked
    if (run.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Can only lock DRAFT payroll runs');
    }

    // 3. Update to OWNER_APPROVED (the "locked" semantic for this schema)
    try {
      const updated = await this.prisma.payrollRun.update({
        where: { id: payrollRunId },
        data:  { status: PayrollStatus.OWNER_APPROVED },
      });

      await this.dashboardService.invalidateTenantKPICache(run.tenantId);

      return updated;
    } catch (err: any) {
      this.logger.error(`Failed to lock payroll run ${payrollRunId}:`, err);
      throw new InternalServerErrorException(
        `Failed to lock payroll run: ${err.message ?? 'Unknown error'}`,
      );
    }
  }
}
