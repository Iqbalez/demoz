/**
 * DTOs for Payroll Generation API.
 *
 * bankAccount and netPay are NOT exposed directly in line responses
 * per the security constraint (no raw salary amounts in responses).
 * Only grossTotal, taxTotal, netTotal summaries are returned at run level.
 */

export class GeneratePayrollDto {
  /** Payroll period in YYYY-MM format (e.g. "2025-01") */
  period: string;
}

export class PayrollLineResponseDto {
  id: string;
  employeeId: string;
  incomeTax: number;
  pensionEmp: number;
  pensionEr: number;
  netPay: number;
  bankCode: string;
  disbursed: boolean;
}

export class PayrollRunResponseDto {
  id: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  grossTotal: number;
  taxTotal: number;
  netTotal: number;
  lines: PayrollLineResponseDto[];
  createdAt: Date;
}
