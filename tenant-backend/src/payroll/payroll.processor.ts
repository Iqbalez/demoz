import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { AiAuditService } from './ai-audit.service';
import { PayrollStatus, Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { tenantStorage } from '../tenant-context';

@Processor('payroll-queue')
export class PayrollProcessor extends WorkerHost {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAudit: AiAuditService,
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

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Enforce strict multi-tenancy context boundary for background thread queries
    return tenantStorage.run(tenantId, async () => {
      try {
        // 1. Flip PayrollRun status to PROCESSING
        await this.prisma.payrollRun.update({
          where: { id: payrollRunId },
          data: { status: PayrollStatus.PROCESSING },
        });

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
            const transportExemptCap = Math.min(base.toNumber() * 0.25, 2200);
            const transportExempt = new Prisma.Decimal(
              Math.min(transportAllowanceGross.toNumber(), transportExemptCap)
            );
            const transportTaxable = transportAllowanceGross.sub(transportExempt);

            // Gross Salary = Base + All Allowances
            const grossSalary = base.add(transportAllowanceGross).add(positionAllowance);

            // --- Pension (POESSA - Proclamation 1268/2022) ---
            // 7% employee and 11% employer of BASIC SALARY, capped at ETB 15,000
            const pensionBase = base.toNumber() > 15000 ? new Prisma.Decimal(15000) : base;
            const pensionDeduction = pensionBase.mul(0.07);       // Employee 7%
            const employerPension = pensionBase.mul(0.11);         // Employer 11%

            // --- Taxable Income (Schedule A formula from docs) ---
            // Taxable = Gross - Employee Pension - Non-taxable Allowances (transport exempt)
            const taxableIncome = grossSalary.sub(pensionDeduction).sub(transportExempt);

            // --- Employment Income Tax (Proclamation 1395/2025 - Schedule A) ---
            // Brackets verified against: report.md, ethiopia_compliance_research.md,
            // ethiopian_compliance_report.md, compliance_guide_for_hr.md
            let taxRate = 0;
            let taxDeductible = 0;

            const taxableVal = taxableIncome.toNumber();
            if (taxableVal <= 2000) {
              taxRate = 0;
              taxDeductible = 0;
            } else if (taxableVal <= 4000) {
              taxRate = 0.15;
              taxDeductible = 300;
            } else if (taxableVal <= 7000) {
              taxRate = 0.20;
              taxDeductible = 500;
            } else if (taxableVal <= 10000) {
              taxRate = 0.25;
              taxDeductible = 850;
            } else if (taxableVal <= 14000) {
              taxRate = 0.30;
              taxDeductible = 1350;
            } else {
              taxRate = 0.35;
              taxDeductible = 2050;
            }

            const incomeTax = new Prisma.Decimal(
              Math.max(0, taxableIncome.toNumber() * taxRate - taxDeductible)
            );

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

        this.logger.log(`Payroll generation completed successfully for run ${payrollRunId}`);
      } catch (error: any) {
        this.logger.error(`Critical error generating payroll ${payrollRunId}:`, error);

        // Handle server-side errors gracefully by flagging parent run as FAILED with diagnostic message
        await this.prisma.payrollRun.update({
          where: { id: payrollRunId },
          data: {
            status: PayrollStatus.FAILED,
            errorMessage: error.message || 'Unknown internal processing error.',
          },
        });
      }
    });
  }
}
