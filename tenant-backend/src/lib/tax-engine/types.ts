export type ErcaBracket =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

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
  /** Employee pension rate from DB PayrollConfig (e.g. 0.07 for 7%). Defaults to 0.07 */
  pensionEmployeeRate?: number;
  /** Employer pension rate from DB PayrollConfig (e.g. 0.11 for 11%). Defaults to 0.11 */
  pensionEmployerRate?: number;
  /** Pension calculation salary cap from DB PayrollConfig. Defaults to 5000 */
  pensionCap?: Money;
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
  /** Employee pension contribution (computed based on base salary, cap, and rate). */
  employeePension: Money;
  /** Employer pension contribution (computed based on base salary, cap, and rate). */
  employerPension: Money;
  /** Net salary = grossIncome - incomeTax - employeePension. */
  netSalary: Money;
  /** ERCA bracket number for the taxableIncome. */
  bracket: ErcaBracket;
}

