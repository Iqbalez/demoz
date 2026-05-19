# HR Manager's Guide: Local Compliance in Ethiopia with Demoz

This guide explains how the **Demoz Workforce Management System** is configured to ensure your business remains 100% compliant with Ethiopian labor laws and tax regulations.

---

## 1. Automatic Income Tax Calculation (Schedule A)
The system eliminates manual calculation errors by automatically applying the latest progressive income tax brackets for employment income (effective 2024/2025).

| Monthly Taxable Income (ETB) | Tax Rate | Deduction (ETB) |
| :--- | :--- | :--- |
| 0 - 2,000 | 0% | 0 |
| 2,001 - 4,000 | 15% | 300 |
| 4,001 - 7,000 | 20% | 500 |
| 7,001 - 10,000 | 25% | 850 |
| 10,001 - 14,000 | 30% | 1,350 |
| Over 14,000 | 35% | 2,050 |

**How Demoz Helps:**
*   It calculates taxable income after the mandatory 7% employee pension deduction.
*   It automatically handles the 2,000 ETB tax-free threshold.
*   It applies the rule engine for non-taxable allowances (e.g., Transport up to 25% of salary or 2,200 ETB).

---

## 2. Pension Contributions (POESSA)
Demoz manages contributions for the **Private Organization Employees Social Security Agency (POESSA)**.

*   **Employee Share:** 7% (Deducted from basic salary).
*   **Employer Share:** 11% (Calculated as an organizational cost).
*   **Total Remittance:** 18% of the basic salary.

**How Demoz Helps:**
*   The system requires a **Pension ID** during employee onboarding to ensure valid reporting.
*   It generates the monthly contribution list in the exact format required by the agency.

---

## 3. Overtime & Holiday Pay Rules
The Ethiopian Labor Proclamation (No. 1156/2019) specifies strict multipliers for work performed outside regular hours. Demoz applies these automatically based on attendance logs:

| Overtime Type | Multiplier | Time Period |
| :--- | :--- | :--- |
| **Daytime OT** | 1.5x | 6:00 AM - 10:00 PM |
| **Nighttime OT** | 1.75x | 10:00 PM - 6:00 AM |
| **Weekly Rest Day** | 2.0x | Sundays (or scheduled rest day) |
| **Public Holiday** | 2.5x | Official holidays (e.g., Meskel, Genna) |

**How Demoz Helps:**
*   The system includes a pre-loaded **2026 Ethiopian Holiday Calendar**.
*   It automatically applies the **2.5x multiplier** for work done on holidays like *Victory of Adwa Day* or *Eid al-Fitr*.

---

## 4. Labor Law Guardrails (Limits)
To protect your company from legal liability, Demoz monitors the statutory limits on working hours:

*   **Daily Limit:** Maximum 2 hours of overtime per day.
*   **Monthly Limit:** Maximum 20 hours of overtime per month.
*   **Annual Limit:** Maximum 100 hours of overtime per year.

**How Demoz Helps:**
*   The system flags an **"Overtime Violation"** alert if these limits are exceeded, allowing HR to address the issue before it becomes a compliance risk.

---

## 5. Audit Readiness & Statutory Reporting
Compliance isn't just about calculation; it's about reporting. Demoz generates the following reports at the click of a button:

1.  **SIGTAS e-Filing Export:** A CSV/Excel file ready for upload to the Ministry of Revenues.
2.  **Pension Remittance Report:** A master list of all employee and employer contributions.
3.  **Encrypted PDF Payslips:** Provides employees with a transparent breakdown of their earnings and statutory deductions, fulfilling legal notice requirements.

---

## 6. Pro-Tips for HR Managers
*   **Keep TINs Updated:** Ensure every employee has their Taxpayer Identification Number recorded to avoid issues with SIGTAS.
*   **Geofence Enforcement:** Use the geofencing feature to ensure attendance records are legally defensible (proving the employee was actually at the work site).
*   **Monthly Deadlines:** Always initiate your payroll run by the **27th** to ensure you meet the **30th day** remittance deadline for tax and pension.

---
*Created by: agent-researcher*
*Date: May 8, 2026*
