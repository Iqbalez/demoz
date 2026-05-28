export type ErcaBracket =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7;

export type Money = number;

export interface ErcaTaxInput {
  /** Monthly base salary (ETB). Pension is computed from this only. */
  baseSalary: Money;
  /** Monthly transport allowance (ETB). Non-taxable up to 600 ETB/month. */
  transportAllowance?: Money;
  /** Monthly housing allowance (ETB). Fully taxable. */
  housingAllowance?: Money;
  /** Monthly overtime earnings (ETB). Fully taxable. */
  overtime?: Money;
}

export interface ErcaTaxResult {
  /** Base + taxable allowances + overtime (transport capped exemption included). */
  grossIncome: Money;
  /** Transport allowance portion treated as taxable. */
  transportTaxable: Money;
  /** Transport allowance portion treated as exempt. */
  transportExempt: Money;
  /** Taxable income after subtracting employee pension. */
  taxableIncome: Money;
  /** Monthly income tax (ETB). */
  incomeTax: Money;
  /** Employee pension contribution (7% of base salary). */
  employeePension: Money;
  /** Employer pension contribution (11% of base salary). */
  employerPension: Money;
  /** Net salary = grossIncome - incomeTax - employeePension. */
  netSalary: Money;
  /** ERCA bracket number for the taxableIncome. */
  bracket: ErcaBracket;
}

