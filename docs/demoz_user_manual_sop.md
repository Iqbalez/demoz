# Demoz Workforce Management System: System SOP & HR User Manual

Welcome to **Demoz**, a comprehensive workforce management system designed specifically for the Ethiopian market. This manual provides a step-by-step guide for HR Managers and Administrators to manage attendance, ensure local compliance, and execute bulk salary payments.

---

## 1. System Overview
Demoz automates the entire lifecycle of employee management:
**Attendance Tracking (GPS/Geofencing) → Local Compliance Calculation (Tax/Pension) → Bulk Payment (Chapa/Mobile Money).**

---

## 2. System Setup (SOP for Administrators)

### 2.1 Organizational Structure
1.  **Organization Profile:** Go to `Settings > Organization`. Enter your company's registered name, address, and **Taxpayer Identification Number (TIN)**.
2.  **Departments:** Create departments (e.g., Sales, Operations) and assign managers.

### 2.2 Geofencing Setup
To ensure employees check in from the correct work locations:
1.  Navigate to `Attendance > Geofences`.
2.  Click **Create New Geofence**.
3.  Search for your office location on the map or enter coordinates.
4.  Set a **Radius** (recommended 50m - 100m).
5.  Assign the geofence to specific departments or the entire organization.

---

## 3. Employee Management

### 3.1 Onboarding & Compliance Requirements
For the system to calculate payroll correctly, the following fields are **mandatory** during onboarding:
*   **Full Name & Phone Number**
*   **TIN (Taxpayer Identification Number):** Required for Income Tax declarations.
*   **Pension ID:** Required for POESSA reporting.
*   **Basic Salary & Allowances:** Specify if allowances are taxable or non-taxable.

### 3.2 Attendance Flow (Employee Experience)
*   **Smartphone Check-In:** Employees open the Demoz mobile app. The app verifies their GPS location against the assigned Geofence.
    *   **GPS Status:** If the employee is outside the fence, the app will prevent check-in and display a "Location Out of Range" message.
    *   **Offline Mode:** If there is no internet, the app logs the check-in time and GPS coordinates locally. The record will sync automatically once data connectivity is restored.
*   **USSD/SMS Fallback (For Non-Smartphones):**
    1.  **USSD:** Employees can dial `*888#` from any mobile phone. Select "Check-in" or "Check-out".
    2.  **SMS:** Send "IN [Company_Code]" or "OUT" to 8XXX. 
    3.  *Note: Administrators must enable USSD access for specific employees in the User Profile.*

---

## 4. Monthly Payroll Cycle (SOP)

### 4.1 Maker-Checker Approval Workflow
Demoz follows a high-security "Maker-Checker" process to ensure zero errors and prevent fraud in salary payments.

1.  **The Maker (HR/Payroll Clerk):** Prepares the monthly payroll draft, reviews attendance, and calculates the registry. Sets the status to **"Pending Finance Review"**.
2.  **The Checker 1 (Finance Manager):** Reviews the payroll totals, verifies that tax and pension deductions match statutory rates (7%/11%), and ensures the company has sufficient liquidity. Sets the status to **"Approved by Finance"**.
3.  **The Checker 2 (General Manager/Owner):** Performs the final high-level review of the payout summary. Provides the final digital authorization to execute the bulk transfer.

### 4.2 Step 1: Attendance Review
*   Navigate to `Attendance > Records`.
*   Review "Late" or "Early Leave" flags.
*   HR must approve or adjust any "Pending Overtime" hours before the payroll run.

### 4.3 Step 2: Payroll Run & Compliance Audit
*   Go to `Payroll > New Run`. Select the current month.
*   **Compliance Check:** The system automatically applies the **Ethiopian Compliance Engine**:
    *   **Pension:** Deducts 7% (Employee) and adds 11% (Employer).
    *   **Income Tax:** Applies Schedule A brackets (0-35%).
*   **Alerts:** If an employee's overtime exceeds legal limits (e.g., >20 hours/month), the system will flag it for HR review.

### 4.4 Step 3: Bulk Payment Execution
1.  Once approved, go to `Payments > Bulk Transfers`.
2.  Select the approved Payroll Run.
3.  Select **Chapa** as the gateway.
4.  Click **Initiate Payout**. This will securely send funds to employees' **Telebirr**, **CBE Birr**, or Commercial Bank accounts.

### 4.5 Step 4: Reconciliation
*   After the transfer, the system will update the status of each payment.
*   **Success:** Payment is marked "Paid" in the system.
*   **Failed:** The system highlights failures (e.g., incorrect account number). HR can correct the details and "Retry" the specific transaction.

---

## 5. Regulatory Reporting

The system generates ready-to-file documents:
1.  **SIGTAS e-Filing:** Download the `Monthly_Income_Tax.xlsx` for direct upload to the Ministry of Revenues portal.
2.  **Pension Report:** Download the `POESSA_Pension_List.csv` for the Pension Agency.
3.  **Digital Payslips:** Employees receive an encrypted PDF payslip in their mobile app immediately after payout.

---

## 6. Troubleshooting & Local Support

### 6.1 Connectivity Issues
*   **Syncing Logs:** If attendance logs aren't appearing, ensure the employee has opened the app while online to sync local data.
*   **Data Usage:** The Demoz app is optimized for low-bandwidth 3G/4G connections.

### 6.2 Payment Failures
*   **Insufficient Balance:** Ensure your Chapa merchant wallet or linked bank account has sufficient funds before initiating a bulk transfer.
*   **Account Mismatch:** Verify the employee's name matches their bank/mobile money registration.

### 6.3 Local Support
For system assistance, contact:
*   **Email:** support@demoz.et
*   **Phone:** +251-11-XXXXXXX (Addis Ababa Office)

---
*Document Version: 1.0*
*Target Audience: HR Managers & System Administrators in Ethiopia*
