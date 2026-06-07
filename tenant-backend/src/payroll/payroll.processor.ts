import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { AiAuditService } from './ai-audit.service';
import { PayrollStatus, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { tenantStorage } from '../tenant-context';

import { DashboardService } from '../dashboard/dashboard.service';
// IMPORTANT: verify these brackets annually. Source: ERCA / Proc. 1395/2025
// Ethiopian Income Tax Schedule A — Proclamation No. 1395/2025
// Monthly employment income brackets (ETB)
export const ETHIOPIAN_INCOME_TAX_BRACKETS = [
  { min: 0,      max: 600,    rate: 0.00, fixedDeduction: 0     },
  { min: 601,    max: 1650,   rate: 0.10, fixedDeduction: 60    },
  { min: 1651,   max: 3200,   rate: 0.15, fixedDeduction: 142.5 },
  { min: 3201,   max: 5250,   rate: 0.20, fixedDeduction: 302.5 },
  { min: 5251,   max: 7800,   rate: 0.25, fixedDeduction: 565   },
  { min: 7801,   max: 10900,  rate: 0.30, fixedDeduction: 955   },
  { min: 10901,  max: Infinity, rate: 0.35, fixedDeduction: 1500 },
] as const;

@Processor('payroll-queue')
export class PayrollProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAudit: AiAuditService,
    private readonly dashboardService: DashboardService,
  ) {
    super();
  }

  /**
   * Performs the background payroll calculation task.
   * Leverages Prisma Cursors for minimal RAM consumption.
   */
  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, periodStart, periodEnd, payrollRunId } = job.data;
    this.logger.log(`Starting background processing for job ${job.id} (Run: ${payrollRunId})`);

    const start = new Date(periodStart.includes('T') ? periodStart : `${periodStart}T00:00:00.000Z`);
    const end = new Date(periodEnd.includes('T') ? periodEnd : `${periodEnd}T23:59:59.999Z`);

    // Enforce strict multi-tenancy context boundary for background thread queries
    return tenantStorage.run(tenantId, async () => {
      try {
        // Clean up any existing line items for this run (e.g. from a previous crashed run attempt)
        await this.prisma.payrollLineItem.deleteMany({
          where: { payrollRunId },
        });

        // 1. Flip PayrollRun status to PROCESSING
        await this.prisma.payrollRun.update({
          where: { id: payrollRunId },
          data: { status: PayrollStatus.PROCESSING },
        });

        const payrollConfig = await this.prisma.payrollConfig.findUnique({
          where: { tenantId },
        });
        const pensionCap = new Prisma.Decimal(payrollConfig?.pensionCap ?? 15000);
        const pensionEmployeeRate = new Prisma.Decimal(payrollConfig?.pensionEmployee ?? 7).div(100);
        const pensionEmployerRate = new Prisma.Decimal(payrollConfig?.pensionEmployer ?? 11).div(100);
        const flexible = (payrollConfig?.flexiblePayrollOptions ?? {}) as Record<string, boolean>;
        const useLegalDefaults = (payrollConfig?.complianceMode ?? 'LEGAL') === 'LEGAL' && !flexible.skipPensionCap;

        // 2. Run the pattern matching AI audit scanner
        const auditReport = await this.aiAudit.runAudit(
          payrollRunId,
          tenantId,
          start,
          end,
        );
        const blockedIds = auditReport.flaggedEmployeeIds as string[];

        let totalGross = new Prisma.Decimal(0);
        let totalNet = new Prisma.Decimal(0);
        let totalTax = new Prisma.Decimal(0);

        // 3. Stream active employees using Prisma Cursors to prevent RAM choke
        let lastId: string | undefined = undefined;
        const batchSize = 100;

        while (true) {
          const employees = await this.prisma.employee.findMany({
            where: {
              tenantId,
              status: 'ACTIVE',
            },
            take: batchSize,
            skip: lastId ? 1 : 0,
            cursor: lastId ? { id: lastId } : undefined,
            orderBy: { id: 'asc' },
          });

          if (employees.length === 0) {
            break;
          }

          lastId = employees[employees.length - 1].id;

          // Process current batch of workers
          for (const employee of employees) {
            // If employee is blocked/flagged by compliance check, skip calculations for safety
            if (blockedIds.includes(employee.id)) {
              this.logger.warn(
                `Compliance Audit Block: Skipped calculations for employee ${employee.id} due to security anomalies.`,
              );
              continue;
            }

            const base = new Prisma.Decimal(employee.baseSalary);
            
            // --- Allowances & Gross Salary ---
            const transportAllowanceGross = new Prisma.Decimal(employee.transportAllowance || 0);
            const positionAllowance = new Prisma.Decimal(employee.positionAllowance || 0);

            // Non-taxable transport allowance exemption rule (ethiopian_compliance_report.md):
            // Exempt up to 25% of basic salary OR 2,200 ETB, whichever is LOWER
            const transportExemptCap = base.mul(0.25).lt(new Prisma.Decimal(2200))
              ? base.mul(0.25)
              : new Prisma.Decimal(2200);
            const transportExempt = transportAllowanceGross.lt(transportExemptCap)
              ? transportAllowanceGross
              : transportExemptCap;
            const transportTaxable = transportAllowanceGross.sub(transportExempt);

            // Gross Salary = Base + All Allowances
            const grossSalary = base.add(transportAllowanceGross).add(positionAllowance);

            // --- Pension (POESSA - Proclamation 1268/2022) ---
            const cap = useLegalDefaults ? pensionCap : base;
            const pensionBase = base.gt(cap) ? cap : base;
            const pensionDeduction = pensionBase.mul(pensionEmployeeRate);
            const employerPension = pensionBase.mul(pensionEmployerRate);

            // --- Taxable Income (Schedule A formula from docs) ---
            // Taxable = Gross - Employee Pension - Non-taxable Allowances (transport exempt)
            const taxableIncome = grossSalary.sub(pensionDeduction).sub(transportExempt);

            // --- Employment Income Tax (Proclamation 1395/2025 - Schedule A) ---
            // Formula: tax = (taxableIncome * rate) - fixedDeduction
            // Decimal‑only tax‑bracket evaluation
            let taxRate = new Prisma.Decimal(0);
            let taxDeductible = new Prisma.Decimal(0);

            for (const bracket of ETHIOPIAN_INCOME_TAX_BRACKETS) {
              if (bracket.max === Infinity || taxableIncome.lte(new Prisma.Decimal(bracket.max))) {
                taxRate = new Prisma.Decimal(bracket.rate);
                taxDeductible = new Prisma.Decimal(bracket.fixedDeduction);
                break;
              }
            }

            const incomeTax = taxableIncome
              .mul(taxRate)
              .sub(taxDeductible)
              .gt(new Prisma.Decimal(0))
              ? taxableIncome.mul(taxRate).sub(taxDeductible)
              : new Prisma.Decimal(0);

            // Net Pay: Gross - Pension(7%) - Income Tax
            const netPay = grossSalary.sub(pensionDeduction).sub(incomeTax);

            // Persist the line item log with full audit trail
            await this.prisma.payrollLineItem.create({
              data: {
                payrollRunId,
                employeeId: employee.id,
                baseSalary: base,
                transportAllowance: transportAllowanceGross,
                transportAllowanceExempt: transportExempt,
                taxableAllowances: transportTaxable.add(positionAllowance),
                overtimePay: 0,
                grossSalary,
                incomeTax,
                pensionDeduction,
                employerPensionContribution: employerPension,
                netPay,
              },
            });

            // Aggregate totals
            totalGross = totalGross.add(grossSalary);
            totalNet = totalNet.add(netPay);
            totalTax = totalTax.add(incomeTax);
          }
        }

        // 4. Update parent PayrollRun as COMPLETED with sums
        await this.prisma.payrollRun.update({
          where: { id: payrollRunId },
          data: {
            status: PayrollStatus.COMPLETED,
            totalGross,
            totalNet,
            totalTax,
          },
        });

        await this.dashboardService.invalidateTenantKPICache(tenantId);
        this.logger.log(`Payroll generation completed successfully for run ${payrollRunId}`);
      } catch (error: any) {
        this.logger.error(`Critical error generating payroll ${payrollRunId}:`, error);

        // Clean up any partially created line items for this run to keep database integrity
        try {
          await this.prisma.payrollLineItem.deleteMany({
            where: { payrollRunId },
          });
        } catch (cleanupError) {
          this.logger.error(`Failed to clean up payroll line items for run ${payrollRunId}:`, cleanupError);
        }

        // Handle server-side errors gracefully by flagging parent run as FAILED with diagnostic message
        await this.prisma.payrollRun.update({
          where: { id: payrollRunId },
          data: {
            status: PayrollStatus.FAILED,
            errorMessage: error.message || 'Unknown internal processing error.',
          },
        });
        await this.dashboardService.invalidateTenantKPICache(tenantId);
      }
    });
  }
}
