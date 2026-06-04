import { ETHIOPIAN_INCOME_TAX_BRACKETS } from './payroll.processor';

describe('Ethiopian Income Tax Brackets (Proclamation No. 1395/2025)', () => {
  it('should have exactly 7 tax brackets', () => {
    expect(ETHIOPIAN_INCOME_TAX_BRACKETS).toHaveLength(7);
  });

  it('Bracket 1: 0 - 600 ETB should be tax free', () => {
    const bracket = ETHIOPIAN_INCOME_TAX_BRACKETS[0];
    expect(bracket.min).toBe(0);
    expect(bracket.max).toBe(600);
    expect(bracket.rate).toBe(0.00);
    expect(bracket.fixedDeduction).toBe(0);
  });

  it('Bracket 2: 601 - 1,650 ETB should be 10% with 60 fixed deduction', () => {
    const bracket = ETHIOPIAN_INCOME_TAX_BRACKETS[1];
    expect(bracket.min).toBe(601);
    expect(bracket.max).toBe(1650);
    expect(bracket.rate).toBe(0.10);
    expect(bracket.fixedDeduction).toBe(60);
  });

  it('Bracket 3: 1,651 - 3,200 ETB should be 15% with 142.5 fixed deduction', () => {
    const bracket = ETHIOPIAN_INCOME_TAX_BRACKETS[2];
    expect(bracket.min).toBe(1651);
    expect(bracket.max).toBe(3200);
    expect(bracket.rate).toBe(0.15);
    expect(bracket.fixedDeduction).toBe(142.5);
  });

  it('Bracket 4: 3,201 - 5,250 ETB should be 20% with 302.5 fixed deduction', () => {
    const bracket = ETHIOPIAN_INCOME_TAX_BRACKETS[3];
    expect(bracket.min).toBe(3201);
    expect(bracket.max).toBe(5250);
    expect(bracket.rate).toBe(0.20);
    expect(bracket.fixedDeduction).toBe(302.5);
  });

  it('Bracket 5: 5,251 - 7,800 ETB should be 25% with 565 fixed deduction', () => {
    const bracket = ETHIOPIAN_INCOME_TAX_BRACKETS[4];
    expect(bracket.min).toBe(5251);
    expect(bracket.max).toBe(7800);
    expect(bracket.rate).toBe(0.25);
    expect(bracket.fixedDeduction).toBe(565);
  });

  it('Bracket 6: 7,801 - 10,900 ETB should be 30% with 955 fixed deduction', () => {
    const bracket = ETHIOPIAN_INCOME_TAX_BRACKETS[5];
    expect(bracket.min).toBe(7801);
    expect(bracket.max).toBe(10900);
    expect(bracket.rate).toBe(0.30);
    expect(bracket.fixedDeduction).toBe(955);
  });

  it('Bracket 7: Over 10,900 ETB should be 35% with 1500 fixed deduction', () => {
    const bracket = ETHIOPIAN_INCOME_TAX_BRACKETS[6];
    expect(bracket.min).toBe(10901);
    expect(bracket.max).toBe(Infinity);
    expect(bracket.rate).toBe(0.35);
    expect(bracket.fixedDeduction).toBe(1500);
  });

  it('should cover all income ranges contiguously', () => {
    for (let i = 0; i < ETHIOPIAN_INCOME_TAX_BRACKETS.length - 1; i++) {
      const current = ETHIOPIAN_INCOME_TAX_BRACKETS[i];
      const next = ETHIOPIAN_INCOME_TAX_BRACKETS[i + 1];
      expect(next.min).toBe(current.max + 1);
    }
  });
});
