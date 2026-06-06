import { BadRequestException } from '@nestjs/common';
import type { ErcaBracket, ErcaTaxInput, ErcaTaxResult, Money } from './types';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toMoney(value: unknown, fieldName: string): Money {
  const num =
    typeof value === 'string'
      ? Number(value)
      : typeof value === 'number'
        ? value
        : value == null
          ? 0
          : Number.NaN;

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new BadRequestException(`${fieldName} must be a valid number`);
  }
  if (num < 0) {
    throw new BadRequestException(`${fieldName} cannot be negative`);
  }
  return round2(num);
}

type BracketDef = {
  bracket: ErcaBracket;
  /** inclusive upper bound for this bracket; null means infinity */
  upTo: number | null;
  rate: number;
  /** Base tax amount at this bracket's lower bound */
  baseTax: number;
  /** Lower bound (exclusive, except bracket 1) */
  over: number;
};

// ERCA Schedule A (monthly employment income) — Proclamation No. 1395/2025
// Updated from the now-obsolete Proclamation No. 979/2016.
const ERCA_BRACKETS: BracketDef[] = [
  { bracket: 1, upTo: 2000,  rate: 0.0,  baseTax: 0,    over: 0 },
  { bracket: 2, upTo: 4000,  rate: 0.15, baseTax: 0,    over: 2000 },
  { bracket: 3, upTo: 7000,  rate: 0.20, baseTax: 300,  over: 4000 },
  { bracket: 4, upTo: 10000, rate: 0.25, baseTax: 900,  over: 7000 },
  { bracket: 5, upTo: 14000, rate: 0.30, baseTax: 1650, over: 10000 },
  { bracket: 6, upTo: null,  rate: 0.35, baseTax: 2850, over: 14000 },
];

function getBracketForTaxableIncome(taxableIncome: number): BracketDef {
  for (const b of ERCA_BRACKETS) {
    if (b.upTo == null) return b;
    if (taxableIncome <= b.upTo) return b;
  }
  return ERCA_BRACKETS[ERCA_BRACKETS.length - 1];
}

export function calculateErcaEmploymentTax(input: ErcaTaxInput): ErcaTaxResult {
  const baseSalary = toMoney(input.baseSalary, 'baseSalary');
  const transportAllowance = toMoney(input.transportAllowance ?? 0, 'transportAllowance');
  const housingAllowance = toMoney(input.housingAllowance ?? 0, 'housingAllowance');
  const overtime = toMoney(input.overtime ?? 0, 'overtime');

  // Transport allowance exemption per blueprint: up to 600 ETB/month.
  const transportExempt = round2(Math.min(600, transportAllowance));
  const transportTaxable = round2(Math.max(0, transportAllowance - transportExempt));

  const grossIncome = round2(
    baseSalary + housingAllowance + overtime + transportTaxable + transportExempt,
  );

  // Pension per blueprint: based on base salary only.
  // Now using dynamic DB configuration parameters for rates and cap.
  const pensionEmployeeRate = input.pensionEmployeeRate ?? 0.07;
  const pensionEmployerRate = input.pensionEmployerRate ?? 0.11;
  const pensionCap = input.pensionCap ?? 15000; // POESSA Cap
  
  const pensionableSalary = Math.min(baseSalary, pensionCap);
  const employeePension = round2(pensionableSalary * pensionEmployeeRate);
  const employerPension = round2(pensionableSalary * pensionEmployerRate);

  // Pension reduces taxable income (blueprint requirement).
  const taxableIncome = round2(
    Math.max(0, baseSalary + housingAllowance + overtime + transportTaxable - employeePension),
  );

  const bracketDef = getBracketForTaxableIncome(taxableIncome);
  const incomeTax = round2(
    bracketDef.baseTax + Math.max(0, taxableIncome - bracketDef.over) * bracketDef.rate,
  );

  const netSalary = round2(Math.max(0, grossIncome - incomeTax - employeePension));

  return {
    grossIncome,
    transportTaxable,
    transportExempt,
    taxableIncome,
    incomeTax,
    employeePension,
    employerPension,
    netSalary,
    bracket: bracketDef.bracket,
  };
}

