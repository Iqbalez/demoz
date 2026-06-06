import { BadRequestException } from '@nestjs/common';
import { calculateErcaEmploymentTax } from '../../lib/tax-engine/erca';
import type { ErcaTaxInput } from '../../lib/tax-engine/types';

// ---------------------------------------------------------------------------
// FUNCTION 1 — calculateEthiopianIncomeTax
// ---------------------------------------------------------------------------

/**
 * Calculates employment income tax using Ethiopia's progressive bracket system
 * defined in Proclamation No. 1395/2025 (Schedule A).
 *
 * @param monthlyGross  Gross monthly salary in ETB
 * @returns             Calculated income tax rounded to 2 decimal places
 */
export function calculateEthiopianIncomeTax(monthlyGross: number): number {
  if (isNaN(monthlyGross)) {
    throw new Error('Invalid gross salary');
  }
  if (monthlyGross < 0) {
    return 0;
  }

  let tax: number;

  // Bracket 1: 0 – 2,000 ETB → 0% tax
  if (monthlyGross <= 2000) {
    tax = 0;
  }
  // Bracket 2: 2,000.01 – 4,000 ETB → 15%
  else if (monthlyGross <= 4000) {
    tax = (monthlyGross - 2000) * 0.15;
  }
  // Bracket 3: 4,000.01 – 7,000 ETB → 20%
  else if (monthlyGross <= 7000) {
    tax = 300 + (monthlyGross - 4000) * 0.20;
  }
  // Bracket 4: 7,000.01 – 10,000 ETB → 25%
  else if (monthlyGross <= 10000) {
    tax = 900 + (monthlyGross - 7000) * 0.25;
  }
  // Bracket 5: 10,000.01 – 14,000 ETB → 30%
  else if (monthlyGross <= 14000) {
    tax = 1650 + (monthlyGross - 10000) * 0.30;
  }
  // Bracket 6: 14,000.01+ ETB → 35%
  else {
    tax = 2850 + (monthlyGross - 14000) * 0.35;
  }

  return Math.round(tax * 100) / 100;
}

// ---------------------------------------------------------------------------
// FUNCTION 2 — calculatePensionDeductions
// ---------------------------------------------------------------------------

/**
 * Calculates mandatory pension contributions per Proclamation No. 714/2011.
 *
 * - Employee contribution: 7% of gross salary
 * - Employer contribution: 11% of gross salary
 *
 * @param basicSalary   Basic monthly salary in ETB (Pension base)
 * @param config        Optional dynamic DB config overrides (rates, cap)
 * @returns             { employee, employer } both rounded to 2 decimal places
 */
export function calculatePensionDeductions(
  basicSalary: number,
  config?: { employeeRate: number; employerRate: number; cap: number }
): {
  employee: number;
  employer: number;
} {
  if (isNaN(basicSalary)) {
    throw new Error('Invalid basic salary');
  }
  if (basicSalary < 0) {
    return { employee: 0, employer: 0 };
  }

  const employeeRate = config?.employeeRate ?? 0.07;
  const employerRate = config?.employerRate ?? 0.11;
  const cap = config?.cap ?? 15000;
  
  const pensionableSalary = Math.min(basicSalary, cap);

  return {
    employee: Math.round(pensionableSalary * employeeRate * 100) / 100,
    employer: Math.round(pensionableSalary * employerRate * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// FUNCTION 3 — calculateNetSalary
// ---------------------------------------------------------------------------

export interface NetSalaryResult {
  grossSalary: number;
  incomeTax: number;
  pensionEmployee: number;
  pensionEmployer: number;
  netSalary: number;
}

/**
 * Combines income tax and pension deductions to produce the final net pay.
 *
 * @param basicSalary   Basic monthly salary in ETB
 * @param config        Optional dynamic DB config overrides for pension
 * @returns             Full breakdown including grossSalary, incomeTax,
 *                      pensionEmployee, pensionEmployer, and netSalary
 */
export function calculateNetSalary(
  basicSalary: number,
  config?: { employeeRate: number; employerRate: number; cap: number }
): NetSalaryResult {
  const incomeTax = calculateEthiopianIncomeTax(basicSalary);
  const { employee: pensionEmployee, employer: pensionEmployer } = calculatePensionDeductions(
    basicSalary,
    config
  );

  const netSalary = Math.round((basicSalary - incomeTax - pensionEmployee) * 100) / 100;

  return {
    grossSalary: Math.round(basicSalary * 100) / 100,
    incomeTax,
    pensionEmployee,
    pensionEmployer,
    netSalary,
  };
}

/**
 * New production calculator: handles allowances, transport exemption, and pension-reduced taxable income.
 * This is what payroll should use.
 */
export function calculateErcaPayrollTax(input: ErcaTaxInput) {
  return calculateErcaEmploymentTax(input);
}

// ---------------------------------------------------------------------------
// FUNCTION 4 — validateSalaryInput
// ---------------------------------------------------------------------------

/**
 * Validates and normalises salary input from API request bodies.
 * API payloads sometimes arrive as strings so this handles coercion safely.
 *
 * @param salary  Raw salary value (number or string)
 * @returns       Parsed, validated numeric salary
 * @throws        BadRequestException on invalid or negative input
 */
export function validateSalaryInput(salary: number | string): number {
  const parsed = typeof salary === 'string' ? parseFloat(salary) : salary;

  if (isNaN(parsed)) {
    throw new BadRequestException('Salary must be a valid number');
  }
  if (parsed < 0) {
    throw new BadRequestException('Salary cannot be negative');
  }

  return parsed;
}
