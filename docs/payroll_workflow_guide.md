# Ethiopian Workforce Management: End-to-End Payroll & Compliance Workflow

This guide outlines the standard operating procedure (SOP) for an Ethiopian business to manage attendance, ensure local compliance, and execute bulk payments using the Demoz system.

## 1. Typical Monthly Timeline

| Day | Action | Responsible |
| :--- | :--- | :--- |
| **1st - 25th** | Daily attendance tracking with GPS/Geofencing validation. | Employees / Managers |
| **26th** | Review and close attendance records for the month. | HR / Dept Managers |
| **27th** | Initial Payroll Calculation (Draft). | HR Manager |
| **27th - 28th** | Compliance check and budget approval. | Finance / Admin |
| **29th** | Execute Bulk Payment via Chapa/Bank. | Finance Manager |
| **30th** | Distribute Payslips (PDF). | System (Auto) |
| **1st - 30th (Next Month)** | Tax (ERCA) & Pension (POESSA) reporting and remittance deadline. | Finance / Tax Officer |

---

## 2. Local Compliance Checkpoints

During the payroll run (Draft stage), the system and HR Manager must verify the following:

*   **Overtime Validation:** Ensure no employee exceeds **2 hours/day**, **20 hours/month**, or **100 hours/year** without specific regulatory exceptions.
*   **Tax Brackets:** Verify taxable income components (Basic + Taxable Allowances) against the updated Schedule A brackets (0% - 35%).
*   **Pension IDs:** Ensure every employee on the payroll has a valid Pension ID (POESSA) to avoid rejection during reporting.
*   **TIN Verification:** Ensure all employees have Taxpayer Identification Numbers (TIN) recorded.

---

## 3. The Payroll Run Workflow

### Step 1: Attendance Consolidation
*   System aggregates check-in/out logs.
*   Calculates total regular hours and overtime hours (Day, Night, Weekend, Holiday).
*   Flags anomalies (e.g., missed check-outs or GPS violations).

### Step 2: Compliance Calculation
*   System applies the **Ethiopian Compliance Engine**:
    *   Deducts 7% Employee Pension from Basic Salary.
    *   Adds Taxable Allowances to the remainder.
    *   Calculates Income Tax (Schedule A) on the resulting Taxable Income.
    *   Adds 11% Employer Pension contribution.

### Step 3: Approval & Payout Initiation
*   HR Manager reviews the **Payroll Registry**.
*   Finance Admin approves the batch.
*   The system generates a **Chapa Bulk Transfer** payload.
*   Funds are disbursed to employees' Telebirr, CBE Birr, or Bank accounts.

### Step 4: Reconciliation
*   After payment, the system pulls the **Transfer Completed** status from Chapa.
*   Finance reconciles the "Success" total against the "Paid" records in the ledger.
*   Flags any "Failed" or "Reverted" transfers for manual correction.

---

## 4. User Guide for HR Managers

### Managing Compliance with Demoz
1.  **Onboarding:** Always enter the employee's **TIN** and **Pension ID** before their first payroll.
2.  **Daily:** Check the "Attendance Dashboard" to identify late arrivals or early leavers in real-time.
3.  **End of Month:** 
    *   Go to `Payroll > New Run`.
    *   Click "Sync Attendance" to pull latest hours.
    *   Click "Run Compliance Audit" - the system will highlight any overtime limit violations.
    *   Review the "Tax Liability" summary to ensure cash flow for remittance to ERCA.
4.  **Payout:** Click "Execute Bulk Payout". Authenticate the transaction.
5.  **Reporting:** At the start of the new month, go to `Reports > Regulatory`. Download the **SIGTAS Bulk Upload File** and the **Pension Contribution List**.

---

## 5. Reporting Summary

| Agency | Report Type | System Output | Deadline |
| :--- | :--- | :--- | :--- |
| **Ministry of Revenues** | Income Tax Declaration | `Monthly_Income_Tax.xlsx` | 30th of next month |
| **POESSA** | Pension Contributions | `Pension_Report.csv` | 30th of next month |
| **Employee** | Payslip | `Payslip_{Name}_{Month}.pdf` | Payday |
