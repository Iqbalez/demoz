# Ethiopian Tax Reporting & Payslip Standards

This document defines the standards for employee payslips and monthly regulatory reporting for the Ethiopian Workforce Management System.

## 1. Standard Ethiopian Employee Payslip Format

An Ethiopian payslip must clearly distinguish between taxable and non-taxable earnings and show all statutory deductions.

### Mandatory Fields
*   **Employer Information:** Name, TIN (Taxpayer Identification Number), Address.
*   **Employee Information:** Full Name, Employee ID, TIN, Pension ID Number.
*   **Pay Period:** Month and Year (e.g., May 2026).

### Structure
| Section | Items |
| :--- | :--- |
| **Earnings** | Basic Salary, Transport Allowance, Housing Allowance, Position Allowance, Overtime Pay, Bonuses. |
| **Statutory Deductions** | Employee Pension Contribution (7%), Employment Income Tax (Schedule A). |
| **Other Deductions** | Cost Sharing, Loan Repayments, Union Fees, Staff Association Contributions. |
| **Totals** | Gross Salary, Total Deductions, Net Pay. |

---

## 2. Monthly Reporting Requirements

Employers in Ethiopia are required to file two primary reports every month by the **30th day** of the following month.

### A. Employment Income Tax (ERCA / Ministry of Revenues)
*   **Purpose:** To declare and remit the income tax withheld from employees.
*   **System:** Filed via the SIGTAS e-filing portal or manual submission.
*   **Format:** Typically an Excel/CSV bulk upload template.

### B. Pension Contribution Report (POESSA)
*   **Purpose:** To report contributions to the Private Organization Employees Social Security Agency.
*   **Details:** Includes both the 7% employee and 11% employer contributions.
*   **Mandatory:** Pension ID number for every employee is required for processing.

---

## 3. System Generated Compliance Documents

The system should automate the generation of the following files:

| File Name | Format | Description |
| :--- | :--- | :--- |
| `Monthly_Income_Tax_Declaration` | CSV/XLSX | Bulk upload file for Ministry of Revenues SIGTAS. |
| `Monthly_Pension_Report` | CSV/XLSX | Contribution list for the Pension Agency (POESSA). |
| `Employee_Payslips` | PDF | Individual encrypted payslips for distribution. |
| `Payroll_Registry` | PDF/XLSX | Comprehensive master list of all earnings and deductions for internal audit. |
| `Bank_Transfer_Instruction` | CSV/Text | Format compatible with bank bulk payment systems (e.g., CBE, Chapa). |

---

## 4. Monthly Tax & Pension Report Template (Sample)

This template represents the standard columns required for integrated reporting.

| No | Employee Name | TIN | Pension ID | Basic Salary | Taxable Allowances | Non-Taxable Allowances | Overtime | Gross Salary | 7% Pension (Emp) | 11% Pension (Org) | Taxable Income | Income Tax | Net Pay |
| :-- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Abebe Bikila | 0012345678 | P-998877 | 15,000 | 2,000 | 1,000 | 500 | 18,500 | 1,050 | 1,650 | 16,450 | 3,707.50 | 12,742.50 |
| 2 | Almaz Ayana | 0087654321 | P-112233 | 10,000 | 1,500 | 500 | 0 | 12,000 | 700 | 1,100 | 10,800 | 1,890.00 | 8,910.00 |

**Note on Taxable Income Calculation:**
`Taxable Income = Gross Salary - Employee Pension (7%) - Non-taxable Allowances (e.g., transport up to 25% of basic salary or 2,200 ETB, whichever is lower - *subject to latest specific directives*)`.
