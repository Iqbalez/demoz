# Ethiopian Workforce Management Compliance Research

This document outlines the legal and compliance requirements for a Workforce Management System in Ethiopia, covering income tax, pension, overtime, leave, and payment infrastructure.

## 1. Employment Income Tax (Schedule A)
Effective from 2024/2025 (Reflecting the latest reforms to increase the tax-free threshold).

| Monthly Taxable Income (ETB) | Tax Rate (%) | Deductible (ETB) |
| :--- | :--- | :--- |
| 0 - 2,000 | 0% | 0 |
| 2,001 - 4,000 | 15% | 300 |
| 4,001 - 7,000 | 20% | 500 |
| 7,001 - 10,000 | 25% | 850 |
| 10,001 - 14,000 | 30% | 1,350 |
| Over 14,000 | 35% | 2,050 |

**Formula:** `(Gross Salary - Pension - Non-taxable Allowances) * Rate - Deductible`

---

## 2. Pension Contributions
Governed by the Private Organization Employees' Social Security Proclamation No. 1268/2022.

*   **Employee Contribution:** 7% of basic salary.
*   **Employer Contribution:** 11% of basic salary.
*   **Total Contribution:** 18% of basic salary.

*Note: Contributions must be remitted within 30 days of the end of the month. Both TIN and Pension ID are mandatory for payroll reporting.*

---

## 3. Non-Taxable Allowances Rule Engine
In Ethiopia, certain allowances are exempt from income tax up to specific caps.

| Transport Allowance | Up to 1/4 (25%) of basic salary or 2,200 ETB (whichever is lower) | Must be specified in the employment contract. |
| Representation Allowance | Up to 10% of basic salary or 2,200 ETB (whichever is lower) | Only for specific job roles. |
| Hardship Allowance | 10-30% of basic salary | Depending on the difficulty of the work location. |
| Per Diem | Based on government rates | For work-related travel outside the usual place of work. |

**Rule Engine Logic:**
`Taxable_Income = Gross_Salary - Employee_Pension - Σ(Allowances - Exempt_Amount)`

---

## 3. Overtime Calculation Rules
Based on Labor Proclamation No. 1156/2019.

| Type of Overtime | Time Period | Multiplier |
| :--- | :--- | :--- |
| Day Time | 6:00 AM - 10:00 PM | 1.5x |
| Night Time | 10:00 PM - 6:00 AM | 1.75x |
| Weekly Rest Day | - | 2.0x |
| Public Holiday | - | 2.5x |

**Constraints:**
*   Maximum 2 hours per day.
*   Maximum 20 hours per month.
*   Maximum 100 hours per year.

---

## 4. Public Holidays and Leave Requirements

### Public Holidays (Standard 13 days)
1.  **Genna** (Ethiopian Christmas) - Jan 7
2.  **Timket** (Epiphany) - Jan 19
3.  **Adwa Victory Day** - Mar 2
4.  **Siklet** (Good Friday) - Variable
5.  **Fasika** (Easter Sunday) - Variable
6.  **Eid al-Fitr** - Variable
7.  **International Labour Day** - May 1
8.  **Patriots' Victory Day** - May 5
9.  **Eid al-Adha** - Variable
10. **Derg Downfall Day** - May 28
11. **Mawlid** (Prophet's Birthday) - Variable
12. **Enkutatash** (Ethiopian New Year) - Sep 11/12
13. **Meskel** (Finding of the True Cross) - Sep 27/28

### Leave Requirements
*   **Annual Leave:** 16 working days for the first year, plus 1 day for every additional 2 years of service.
*   **Sick Leave:** Up to 6 months (1st month: 100% pay, 2nd-3rd months: 50% pay, 4th-6th months: no pay).
*   **Maternity Leave:** 120 working days (fully paid).
*   **Paternity Leave:** 3 consecutive days (fully paid).

---

## 5. Attendance Record Keeping
Employers are legally mandated to maintain records including:
*   Hours of work (regular and overtime).
*   Attendance logs (check-in/check-out).
*   Wages and deductions.
*   Annual leave records.

---

## 6. Bulk Payment Infrastructure (APIs)
For automated salary and bulk payments, the following options are available:

1.  **Telebirr (Ethio Telecom):**
    *   Offers B2C (Business to Customer) API for bulk disbursements.
    *   Requires a Business Merchant account.
    *   Popular for reaching unbanked employees.
2.  **CBE Birr (Commercial Bank of Ethiopia):**
    *   Bulk payment services via their mobile money platform.
3.  **Chapa (Payment Gateway):**
    *   Modern API-first platform supporting bulk payouts to banks and mobile wallets.
    *   Documentation: `https://developer.chapa.co/docs/payouts`
4.  **SantimPay:**
    *   Local gateway offering salary disbursement APIs.
