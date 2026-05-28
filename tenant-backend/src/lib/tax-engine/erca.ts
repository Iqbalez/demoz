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

// ERCA Schedule A (monthly employment income), widely used bracket table.
const ERCA_BRACKETS: BracketDef[] = [
  { bracket: 1, upTo: 600, rate: 0.0, baseTax: 0, over: 0 },
  { bracket: 2, upTo: 1650, rate: 0.1, baseTax: 0, over: 600 },
  { bracket: 3, upTo: 3200, rate: 0.15, baseTax: 105, over: 1650 },
  { bracket: 4, upTo: 5250, rate: 0.2, baseTax: 337.5, over: 3200 },
  { bracket: 5, upTo: 7800, rate: 0.25, baseTax: 747.5, over: 5250 },
  { bracket: 6, upTo: 10900, rate: 0.3, baseTax: 1385, over: 7800 },
  { bracket: 7, upTo: null, rate: 0.35, baseTax: 2315, over: 10900 },
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
  const employeePension = round2(baseSalary * 0.07);
  const employerPension = round2(baseSalary * 0.11);

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

