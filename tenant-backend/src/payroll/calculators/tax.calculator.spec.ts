import {
  calculateEthiopianIncomeTax,
  calculatePensionDeductions,
  calculateNetSalary,
  validateSalaryInput,
} from './tax.calculator';
import { BadRequestException } from '@nestjs/common';

// ---------------------------------------------------------------------------
// calculateEthiopianIncomeTax
// ---------------------------------------------------------------------------
describe('calculateEthiopianIncomeTax', () => {
  // TEST 1 – Tax-free threshold: below 600 ETB → 0 tax
  it('returns 0 for income at or below 600 ETB (tax-free threshold)', () => {
    expect(calculateEthiopianIncomeTax(500)).toBe(0);
    expect(calculateEthiopianIncomeTax(600)).toBe(0);
  });

  // TEST 2 – First bracket (10%): 600 – 1,650
  // 1000 → (1000 - 600) * 0.10 = 400 * 0.10 = 40
  it('correctly applies 10% bracket for 1,000 ETB', () => {
    expect(calculateEthiopianIncomeTax(1000)).toBe(40);
  });

  // TEST 3 – Second bracket (15%): 1,650 – 3,200
  // 2000 → 105 + (2000 - 1650) * 0.15 = 105 + 52.50 = 157.50
  it('correctly applies 15% bracket for 2,000 ETB', () => {
    expect(calculateEthiopianIncomeTax(2000)).toBe(157.5);
  });

  // TEST 4 – Top bracket (35%): > 10,900
  // 15000 → 2315 + (15000 - 10900) * 0.35 = 2315 + 1435 = 3750
  it('correctly applies 35% top bracket for 15,000 ETB', () => {
    expect(calculateEthiopianIncomeTax(15000)).toBe(3750);
  });

  it('returns 0 for negative gross salary', () => {
    expect(calculateEthiopianIncomeTax(-100)).toBe(0);
  });

  it('throws Error for NaN input', () => {
    expect(() => calculateEthiopianIncomeTax(NaN)).toThrow('Invalid gross salary');
  });
});

// ---------------------------------------------------------------------------
// calculatePensionDeductions
// ---------------------------------------------------------------------------
describe('calculatePensionDeductions', () => {
  // TEST 5 – Pension deductions for 5,000 ETB
  // employee: 5000 * 0.07 = 350 | employer: 5000 * 0.11 = 550
  it('computes correct employee (7%) and employer (11%) pension for 5,000 ETB', () => {
    const result = calculatePensionDeductions(5000);
    expect(result.employee).toBe(350);
    expect(result.employer).toBe(550);
  });

  it('returns zeroes for negative gross salary', () => {
    const result = calculatePensionDeductions(-100);
    expect(result.employee).toBe(0);
    expect(result.employer).toBe(0);
  });

  it('throws Error for NaN input', () => {
    expect(() => calculatePensionDeductions(NaN)).toThrow('Invalid gross salary');
  });
});

// ---------------------------------------------------------------------------
// calculateNetSalary
// ---------------------------------------------------------------------------
describe('calculateNetSalary', () => {
  // TEST 6 – Full net salary breakdown for 5,000 ETB
  // incomeTax  = 747.50 + (5000 - 5250 * 0.20)
  //   → 5000 is in bracket 3200–5250 (20%): 337.50 + (5000-3200)*0.20 = 337.50 + 360 = 697.50  — wait
  //   actual: 5000 ≤ 5250 → 337.50 + (5000-3200)*0.20 = 337.50 + 360 = 697.50
  //   BUT the user spec says incomeTax: 747.50 for 5000 which is bracket 5250 entry.
  //   5000 ≤ 5250 → 337.50 + (5000-3200)*0.20 = 337.50 + 360 = 697.50 ← correct bracket calc
  //   The user spec shows 747.50 which would require 5250 threshold to be passed.
  //   We follow the official brackets (5000 ≤ 5250) → 697.50.
  //   Test mirrors the actual bracket output, not the spec typo.
  it('returns correct full net salary breakdown for 5,000 ETB', () => {
    const result = calculateNetSalary(5000);
    expect(result.grossSalary).toBe(5000);
    // Bracket 4 (3200-5250 @ 20%): 337.50 + (5000-3200)*0.20 = 337.50 + 360 = 697.50
    expect(result.incomeTax).toBe(697.5);
    expect(result.pensionEmployee).toBe(350);   // 5000 * 0.07
    expect(result.pensionEmployer).toBe(550);   // 5000 * 0.11
    // netSalary = 5000 - 697.50 - 350 = 3952.50
    expect(result.netSalary).toBe(3952.5);
  });

  // Verify the spec example: 5250 ETB → tax should be 747.50
  it('confirms 5,250 ETB sits exactly at bracket 4 ceiling (tax = 747.50)', () => {
    const result = calculateNetSalary(5250);
    expect(result.incomeTax).toBe(747.5);
  });
});

// ---------------------------------------------------------------------------
// validateSalaryInput
// ---------------------------------------------------------------------------
describe('validateSalaryInput', () => {
  // TEST 7 – Invalid string input throws BadRequestException
  it('throws BadRequestException for non-numeric string', () => {
    expect(() => validateSalaryInput('invalid')).toThrow(BadRequestException);
  });

  it('parses numeric strings correctly', () => {
    expect(validateSalaryInput('5000')).toBe(5000);
  });

  it('throws BadRequestException for negative salary', () => {
    expect(() => validateSalaryInput(-100)).toThrow(BadRequestException);
  });

  it('passes through a valid number unchanged', () => {
    expect(validateSalaryInput(3000)).toBe(3000);
  });
});
