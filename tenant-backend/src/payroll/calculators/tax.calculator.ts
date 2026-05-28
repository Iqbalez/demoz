import { BadRequestException } from '@nestjs/common';
import { calculateErcaEmploymentTax } from '../../lib/tax-engine/erca';
import type { ErcaTaxInput } from '../../lib/tax-engine/types';

// ---------------------------------------------------------------------------
// FUNCTION 1 — calculateEthiopianIncomeTax
// ---------------------------------------------------------------------------

/**
 * Calculates employment income tax using Ethiopia's progressive bracket system
 * defined in Proclamation No. 979/2016 (Schedule A).
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

  // Bracket 1: 0 – 600 ETB → 0% tax
  if (monthlyGross <= 600) {
    tax = 0;
  }
  // Bracket 2: 600.01 – 1,650 ETB → 10%
  else if (monthlyGross <= 1650) {
    tax = (monthlyGross - 600) * 0.1;
  }
  // Bracket 3: 1,650.01 – 3,200 ETB → 15%
  else if (monthlyGross <= 3200) {
    tax = 105 + (monthlyGross - 1650) * 0.15;
  }
  // Bracket 4: 3,200.01 – 5,250 ETB → 20%
  else if (monthlyGross <= 5250) {
    tax = 337.5 + (monthlyGross - 3200) * 0.2;
  }
  // Bracket 5: 5,250.01 – 7,800 ETB → 25%
  else if (monthlyGross <= 7800) {
    tax = 747.5 + (monthlyGross - 5250) * 0.25;
  }
  // Bracket 6: 7,800.01 – 10,900 ETB → 30%
  else if (monthlyGross <= 10900) {
    tax = 1385 + (monthlyGross - 7800) * 0.3;
  }
  // Bracket 7: 10,900.01+ ETB → 35%
  else {
    tax = 2315 + (monthlyGross - 10900) * 0.35;
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
 * @param monthlyGross  Gross monthly salary in ETB
 * @returns             { employee, employer } both rounded to 2 decimal places
 */
export function calculatePensionDeductions(monthlyGross: number): {
  employee: number;
  employer: number;
} {
  if (isNaN(monthlyGross)) {
    throw new Error('Invalid gross salary');
  }
  if (monthlyGross < 0) {
    return { employee: 0, employer: 0 };
  }

  return {
    employee: Math.round(monthlyGross * 0.07 * 100) / 100,
    employer: Math.round(monthlyGross * 0.11 * 100) / 100,
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
 * @param monthlyGross  Gross monthly salary in ETB
 * @returns             Full breakdown including grossSalary, incomeTax,
 *                      pensionEmployee, pensionEmployer, and netSalary
 */
export function calculateNetSalary(monthlyGross: number): NetSalaryResult {
  const incomeTax = calculateEthiopianIncomeTax(monthlyGross);
  const { employee: pensionEmployee, employer: pensionEmployer } = calculatePensionDeductions(
    monthlyGross,
  );

  const netSalary = Math.round((monthlyGross - incomeTax - pensionEmployee) * 100) / 100;

  return {
    grossSalary: Math.round(monthlyGross * 100) / 100,
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
