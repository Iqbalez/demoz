import { ETHIOPIAN_INCOME_TAX_BRACKETS } from '../payroll.processor';

function calculateTax(taxableIncome: number): number {
  let taxRate = 0;
  let taxDeductible = 0;

  for (const bracket of ETHIOPIAN_INCOME_TAX_BRACKETS) {
    if (bracket.max === Infinity || taxableIncome <= bracket.max) {
      taxRate = bracket.rate;
      taxDeductible = bracket.fixedDeduction;
      break;
    }
  }

  const tax = (taxableIncome * taxRate) - taxDeductible;
  return tax > 0 ? tax : 0;
}

function calculatePension(grossIncome: number): number {
  const pensionBase = grossIncome > 15000 ? 15000 : grossIncome;
  return pensionBase * 0.07;
}

describe('Ethiopian Income Tax Schedule A (Proc. 1395/2025)', () => {
  it('employee earning 600 ETB pays 0 tax', () => {
    const tax = calculateTax(600);
    expect(tax).toBe(0);
  });

  it('employee earning 1000 ETB pays correct tax', () => {
    // 1000 is in bracket 2: 10% rate, 60 deduction
    // Tax = (1000 * 0.10) - 60 = 100 - 60 = 40
    const tax = calculateTax(1000);
    expect(tax).toBe(40);
  });

  it('employee earning 5000 ETB pays correct tax', () => {
    // 5000 is in bracket 4: 20% rate, 302.5 deduction
    // Tax = (5000 * 0.20) - 302.5 = 1000 - 302.5 = 697.5
    const tax = calculateTax(5000);
    expect(tax).toBe(697.5);
  });

  it('employee earning 15000 ETB pays correct tax', () => {
    // 15000 is in bracket 7: 35% rate, 1500 deduction
    // Tax = (15000 * 0.35) - 1500 = 5250 - 1500 = 3750
    const tax = calculateTax(15000);
    expect(tax).toBe(3750);
  });

  it('pension deduction reduces taxable income before tax calculation', () => {
    // Gross: 5000
    // Pension (7%): 350
    // Taxable Income: 5000 - 350 = 4650
    // 4650 is in bracket 4: 20% rate, 302.5 deduction
    // Tax = (4650 * 0.20) - 302.5 = 930 - 302.5 = 627.5
    const gross = 5000;
    const pension = calculatePension(gross);
    const taxableIncome = gross - pension;
    const tax = calculateTax(taxableIncome);
    
    expect(pension).toBeCloseTo(350, 2);
    expect(taxableIncome).toBeCloseTo(4650, 2);
    expect(tax).toBeCloseTo(627.5, 2);
  });
});
