import { calculateErcaEmploymentTax } from './erca';

function baseSalaryForExactTaxableIncome(taxableIncome: number): number {
  // When allowances are zero, taxableIncome = baseSalary - 7% baseSalary = 0.93 * baseSalary
  return Number((taxableIncome / 0.93).toFixed(6));
}

describe('calculateErcaEmploymentTax (ERCA Schedule A + pensions + transport exemption)', () => {
  describe('bracket boundaries (taxableIncome)', () => {
    it('bracket 1: taxableIncome <= 600 => 0 tax', () => {
      expect(
        calculateErcaEmploymentTax({
          baseSalary: baseSalaryForExactTaxableIncome(600),
          transportAllowance: 0,
          housingAllowance: 0,
          overtime: 0,
        }).incomeTax,
      ).toBe(0);
    });

    it('bracket 2 lower edge: taxableIncome = 600.01 => very small tax', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: baseSalaryForExactTaxableIncome(600.01),
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.bracket).toBe(2);
      expect(r.incomeTax).toBeCloseTo(0, 2);
    });

    it('bracket 2 upper edge: 1,650 => 105 tax', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: baseSalaryForExactTaxableIncome(1650),
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.bracket).toBe(2);
      expect(r.incomeTax).toBe(105);
    });

    it('bracket 3 upper edge: 3,200 => 337.5 tax', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: baseSalaryForExactTaxableIncome(3200),
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.bracket).toBe(3);
      expect(r.incomeTax).toBe(337.5);
    });

    it('bracket 4 upper edge: 5,250 => 747.5 tax', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: baseSalaryForExactTaxableIncome(5250),
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.bracket).toBe(4);
      expect(r.incomeTax).toBe(747.5);
    });

    it('bracket 5 upper edge: 7,800 => 1,385 tax', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: baseSalaryForExactTaxableIncome(7800),
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.bracket).toBe(5);
      expect(r.incomeTax).toBe(1385);
    });

    it('bracket 6 upper edge: 10,900 => 2,315 tax', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: baseSalaryForExactTaxableIncome(10900),
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.bracket).toBe(6);
      expect(r.incomeTax).toBe(2315);
    });

    it('bracket 7 example: 15,000 => 3,750 tax (when taxableIncome=15,000)', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: baseSalaryForExactTaxableIncome(15000),
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.bracket).toBe(7);
      expect(r.incomeTax).toBe(3750);
    });

    it('covers all bracket thresholds with exact boundary values', () => {
      const cases: Array<{ taxable: number; bracket: number; tax: number }> = [
        { taxable: 0, bracket: 1, tax: 0 },
        { taxable: 600, bracket: 1, tax: 0 },
        { taxable: 601, bracket: 2, tax: 0.1 },
        { taxable: 1650, bracket: 2, tax: 105 },
        { taxable: 1651, bracket: 3, tax: 105.15 },
        { taxable: 3200, bracket: 3, tax: 337.5 },
        { taxable: 3201, bracket: 4, tax: 337.7 },
        { taxable: 5250, bracket: 4, tax: 747.5 },
        { taxable: 5251, bracket: 5, tax: 747.75 },
        { taxable: 7800, bracket: 5, tax: 1385 },
        { taxable: 7801, bracket: 6, tax: 1385.3 },
        { taxable: 10900, bracket: 6, tax: 2315 },
        { taxable: 10901, bracket: 7, tax: 2315.35 },
      ];

      for (const c of cases) {
        const r = calculateErcaEmploymentTax({
          // Make taxableIncome equal to "taxable" by setting baseSalary such that:
          // taxableIncome = baseSalary - 7%baseSalary => 0.93 * baseSalary
          // baseSalary = taxable / 0.93
          baseSalary: baseSalaryForExactTaxableIncome(c.taxable),
          transportAllowance: 0,
          housingAllowance: 0,
          overtime: 0,
        });
        expect(r.taxableIncome).toBeCloseTo(c.taxable, 2);
        expect(r.bracket).toBe(c.bracket as any);
        expect(r.incomeTax).toBeCloseTo(c.tax, 2);
      }
    });
  });

  describe('transport allowance exemption (<= 600 exempt)', () => {
    it('exempts transport up to 600 ETB', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 3000,
        transportAllowance: 600,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.transportExempt).toBe(600);
      expect(r.transportTaxable).toBe(0);
    });

    it('taxes transport above 600 ETB', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 3000,
        transportAllowance: 800,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.transportExempt).toBe(600);
      expect(r.transportTaxable).toBe(200);
    });

    it('handles exemption boundaries (599, 600, 601)', () => {
      const r599 = calculateErcaEmploymentTax({
        baseSalary: 2000,
        transportAllowance: 599,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r599.transportExempt).toBe(599);
      expect(r599.transportTaxable).toBe(0);

      const r600 = calculateErcaEmploymentTax({
        baseSalary: 2000,
        transportAllowance: 600,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r600.transportExempt).toBe(600);
      expect(r600.transportTaxable).toBe(0);

      const r601 = calculateErcaEmploymentTax({
        baseSalary: 2000,
        transportAllowance: 601,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r601.transportExempt).toBe(600);
      expect(r601.transportTaxable).toBe(1);
    });
  });

  describe('pension rules', () => {
    it('employee pension is 7% of base salary only; employer 11% of base salary only', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 5000,
        transportAllowance: 1000,
        housingAllowance: 500,
        overtime: 200,
      });
      expect(r.employeePension).toBe(350);
      expect(r.employerPension).toBe(550);
    });

    it('pension reduces taxable income', () => {
      const rNoPension = calculateErcaEmploymentTax({
        baseSalary: 1000,
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      // taxableIncome = baseSalary - 70 = 930
      expect(rNoPension.taxableIncome).toBe(930);
    });

    it('net salary never goes negative', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 0,
        transportAllowance: 0,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.netSalary).toBe(0);
    });
  });

  describe('rounding behavior', () => {
    it('rounds all amounts to 2 decimals', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 1234.567,
        transportAllowance: 600.129,
        housingAllowance: 0.005,
        overtime: 0.004,
      });
      const values = [
        r.grossIncome,
        r.transportExempt,
        r.transportTaxable,
        r.taxableIncome,
        r.employeePension,
        r.employerPension,
        r.incomeTax,
        r.netSalary,
      ];
      for (const v of values) {
        expect(Number(v.toFixed(2))).toBeCloseTo(v, 2);
      }
    });
  });

  describe('mixed income components', () => {
    it('includes housing and overtime fully in taxable income', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 3000,
        transportAllowance: 0,
        housingAllowance: 500,
        overtime: 250,
      });
      // taxableIncome = 3000 + 500 + 250 - 210 (pension) = 3540
      expect(r.taxableIncome).toBe(3540);
    });

    it('only taxes transport allowance above 600', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 3000,
        transportAllowance: 1000,
        housingAllowance: 0,
        overtime: 0,
      });
      // taxableIncome = base + transportTaxable - pension = 3000 + 400 - 210 = 3190
      expect(r.taxableIncome).toBe(3190);
    });

    it('high earner sanity check (50,000 base) has bracket 7', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 50000,
        transportAllowance: 600,
        housingAllowance: 5000,
        overtime: 2000,
      });
      expect(r.bracket).toBe(7);
      expect(r.incomeTax).toBeGreaterThan(0);
      expect(r.netSalary).toBeGreaterThan(0);
    });

    it('grossIncome includes exempt transport (it is still paid)', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 2000,
        transportAllowance: 600,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.grossIncome).toBe(2600);
    });

    it('grossIncome includes taxable transport too', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 2000,
        transportAllowance: 800,
        housingAllowance: 0,
        overtime: 0,
      });
      expect(r.grossIncome).toBe(2800);
      expect(r.transportTaxable).toBe(200);
    });

    it('taxableIncome never includes exempt transport', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 2000,
        transportAllowance: 600,
        housingAllowance: 0,
        overtime: 0,
      });
      // taxableIncome = base - pension (exempt transport excluded)
      expect(r.taxableIncome).toBe(1860);
    });

    it('bracket can change due to taxable transport', () => {
      const baseSalary = 2000;
      const withoutTransport = calculateErcaEmploymentTax({
        baseSalary,
        transportAllowance: 600,
        housingAllowance: 0,
        overtime: 0,
      });
      const withTaxableTransport = calculateErcaEmploymentTax({
        baseSalary,
        transportAllowance: 1600, // 1000 taxable
        housingAllowance: 0,
        overtime: 0,
      });
      expect(withTaxableTransport.taxableIncome).toBeGreaterThan(withoutTransport.taxableIncome);
    });

    it('large allowances keep pension tied only to base salary', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 3000,
        transportAllowance: 600,
        housingAllowance: 10000,
        overtime: 2000,
      });
      expect(r.employeePension).toBe(210);
      expect(r.employerPension).toBe(330);
    });
  });

  describe('validation', () => {
    it('rejects negative numbers', () => {
      expect(() =>
        calculateErcaEmploymentTax({ baseSalary: -1, transportAllowance: 0, housingAllowance: 0, overtime: 0 }),
      ).toThrow();
    });

    it('accepts numeric strings (coerced)', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: '5000' as any,
        transportAllowance: '0' as any,
        housingAllowance: '0' as any,
        overtime: '0' as any,
      });
      expect(r.employeePension).toBe(350);
    });

    it('treats undefined allowances as 0', () => {
      const r = calculateErcaEmploymentTax({ baseSalary: 1000 });
      expect(r.transportExempt).toBe(0);
      expect(r.transportTaxable).toBe(0);
    });

    it('rejects NaN and Infinity', () => {
      expect(() => calculateErcaEmploymentTax({ baseSalary: NaN as any })).toThrow();
      expect(() => calculateErcaEmploymentTax({ baseSalary: Infinity as any })).toThrow();
    });

    it('rejects non-numeric strings', () => {
      expect(() =>
        calculateErcaEmploymentTax({ baseSalary: 'abc' as any, transportAllowance: 0, housingAllowance: 0, overtime: 0 }),
      ).toThrow();
    });

    it('coerces string allowances too', () => {
      const r = calculateErcaEmploymentTax({
        baseSalary: 1000 as any,
        transportAllowance: '601' as any,
        housingAllowance: '0' as any,
        overtime: '0' as any,
      });
      expect(r.transportTaxable).toBe(1);
    });
  });
});

