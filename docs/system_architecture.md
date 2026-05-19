# Demoz Workforce Management System - Architecture & Schema Design

## 1. Overview

**Purpose**: A Jibble-like workforce management system tailored for Ethiopia, handling Attendance → Local Compliance → Bulk Payment.

**Core Modules**:
- **Attendance**: Check-in/out with GPS/Geofencing
- **Compliance**: Ethiopian labor law adherence (leave, contracts, working hours)
- **Payroll**: Salary calculation, tax/pension deductions, bulk payment processing

---

## 2. Tech Stack Recommendation

| Layer | Technology | Rationale |
|-------|-------------|------------|
| Backend API | Node.js + NestJS | TypeScript, scalable, DI framework |
| Database | PostgreSQL | JSON support, complex queries, scaling |
| Mobile App | React Native / Flutter | Cross-platform for Android (Ethiopia market) |
| Auth | JWT + Refresh Tokens | Stateless, secure |
| File Storage | S3-compatible (e.g., MinIO) | Employee documents, receipts |
| Notifications | Firebase Cloud Messaging | Push notifications |

---

## 3. User Management

### 3.1 Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, company settings, user management |
| **Manager** | Team attendance review, approve leave, view reports |
| **Employee** | Check-in/out, view schedule, request leave, view payslips |

### 3.2 User Entity

```
users
├── id (UUID, PK)
├── email (unique)
├── password_hash
├── role (ENUM: admin, manager, employee)
├── first_name
├── last_name
├── phone (for SMS/password recovery)
├── profile_image_url
├── status (ENUM: active, suspended, terminated)
├── created_at
└── updated_at
```

### 3.3 Organization Structure

```
organizations
├── id (UUID, PK)
├── name
├── registered_name
├── tax_id (for Ethiopian tax compliance)
├── address
├── created_at

departments
├── id (UUID, PK)
├── organization_id (FK)
├── name
├── manager_id (FK → users)
├── created_at

user_departments (join table)
├── user_id (FK)
├── department_id (FK)
├── assigned_at
```

---

## 4. Attendance Module

### 4.1 Geofencing Setup

```
geofences
├── id (UUID, PK)
├── organization_id (FK)
├── name (e.g., "Main Office")
├── latitude (center point)
├── longitude (center point)
├── radius_meters
├── is_active
├── created_at
```

### 4.2 Attendance Records

```
attendance_records
├── id (UUID, PK)
├── user_id (FK)
├── date (DATE)
├── check_in_time (TIMESTAMP)
├── check_out_time (TIMESTAMP)
├── check_in_location (JSON: {lat, lng, geofence_id})
├── check_out_location (JSON: {lat, lng, geofence_id})
├── check_in_method (ENUM: gps, manual, wifi)
├── check_out_method (ENUM: gps, manual, wifi)
├── status (ENUM: present, absent, late, early_leave)
├── notes
├── created_at
```

### 4.3 Shift & Schedule

```
shifts
├── id (UUID, PK)
├── organization_id (FK)
├── name (e.g., "Morning Shift")
├── start_time (TIME)
├── end_time (TIME)
├── grace_period_minutes (default: 15)
├── created_at

user_shifts (assignment)
├── user_id (FK)
├── shift_id (FK)
├── effective_from (DATE)
├── effective_to (DATE, nullable)
```

### 4.4 Leave Management

```
leave_types
├── id (UUID, PK)
├── organization_id (FK)
├── name (e.g., "Annual Leave", "Sick Leave")
├── code (e.g., "AL", "SL")
├── max_days_per_year
├── requires_approval (BOOLEAN)
├── created_at

leave_requests
├── id (UUID, PK)
├── user_id (FK)
├── leave_type_id (FK)
├── start_date
├── end_date
├── total_days
├── reason
├── status (ENUM: pending, approved, rejected, cancelled)
├── approved_by (FK → users)
├── approved_at
├── rejection_reason
├── created_at
```

---

## 5. Payroll Module (Core Entities - Tax/Pension Deferred)

### 5.1 Employment & Contracts

```
employment_contracts
├── id (UUID, PK)
├── user_id (FK)
├── contract_type (ENUM: permanent, contract, part_time, commission)
├── start_date
├── end_date (nullable for permanent)
├── probation_end_date
├── working_hours_per_week
├── base_salary (DECIMAL)
├── salary_currency (ETB)
├── pay_frequency (ENUM: monthly, bi-weekly, weekly)
├── created_at
```

### 5.2 Salary Components

```
salary_components
├── id (UUID, PK)
├── name (e.g., "Basic", "Transport Allowance", "Housing Allowance")
├── type (ENUM: earning, deduction, tax, pension)
├── calculation_type (ENUM: fixed, percentage, formula)
├── calculation_value (JSON)
├── is_taxable (BOOLEAN)
├── is_pensionable (BOOLEAN)
├── created_at

user_salary_components
├── id (UUID, PK)
├── user_id (FK)
├── salary_component_id (FK)
├── custom_value (DECIMAL, nullable — override default)
├── effective_from
├── effective_to
```

### 5.3 Payroll Runs

```
payroll_runs
├── id (UUID, PK)
├── organization_id (FK)
├── payroll_period_start (DATE)
├── payroll_period_end (DATE)
├── status (ENUM: draft, calculated, approved, rejected, paid)
├── total_gross (DECIMAL)
├── total_deductions (DECIMAL)
├── total_net (DECIMAL)
├── created_by (FK → users)
├── approved_by (FK → users, nullable)
├── approved_at
├── created_at
```

### 5.4 Payslip

```
payslips
├── id (UUID, PK)
├── payroll_run_id (FK)
├── user_id (FK)
├── period_start (DATE)
├── period_end (DATE)
├── gross_salary (DECIMAL)
├── total_earnings (DECIMAL)
├── total_deductions (DECIMAL)
├── total_taxes (DECIMAL)
├── total_pensions (DECIMAL)
├── net_salary (DECIMAL)
├── status (ENUM: pending, released, paid)
├── released_at
├── created_at
```

---

## 6. Payment Module

### 6.1 Payment Records

```
payments
├── id (UUID, PK)
├── payslip_id (FK)
├── amount (DECIMAL)
├── currency (ETB)
├── payment_method (ENUM: bank_transfer, mobile_money, cash)
├── payment_reference
├── bank_account_name
├── bank_account_number
├── bank_name
├── status (ENUM: pending, processing, completed, failed, cancelled)
├── processed_at
├── failure_reason
├── created_at
```

### 6.2 Bulk Payment Batch

```
payment_batches
├── id (UUID, PK)
├── organization_id (FK)
├── payroll_run_id (FK)
├── total_amount (DECIMAL)
├── total_count (INT)
├── processed_count (INT)
├── status (ENUM: pending, processing, completed, partial_failed, failed)
├── initiated_by (FK → users)
├── initiated_at
├── completed_at
├── created_at
```

---

## 7. API Structure (RESTful)

### 7.1 Authentication
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
```

### 7.2 Users & Organization
```
GET    /api/v1/users                 # List users (admin)
POST   /api/v1/users                 # Create user
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
GET    /api/v1/users/me              # Current user profile

GET    /api/v1/departments
POST   /api/v1/departments
PUT    /api/v1/departments/:id
```

### 7.3 Attendance
```
POST   /api/v1/attendance/check-in
POST   /api/v1/attendance/check-out
GET    /api/v1/attendance/records    # List with filters (date range, user, department)
GET    /api/v1/attendance/records/:id
GET    /api/v1/attendance/summary    # Monthly/weekly summaries

GET    /api/v1/geofences
POST   /api/v1/geofences
PUT    /api/v1/geofences/:id
```

### 7.4 Leave
```
GET    /api/v1/leave/requests
POST   /api/v1/leave/requests
PUT    /api/v1/leave/requests/:id/approve
PUT    /api/v1/leave/requests/:id/reject
GET    /api/v1/leave/balance/:userId
```

### 7.5 Payroll
```
GET    /api/v1/payroll/runs
POST   /api/v1/payroll/runs          # Create/run payroll
GET    /api/v1/payroll/runs/:id
POST   /api/v1/payroll/runs/:id/approve
POST   /api/v1/payroll/runs/:id/reject

GET    /api/v1/payslips
GET    /api/v1/payslips/:id
GET    /api/v1/payslips/:userId      # Employee's payslips
```

### 7.6 Payments
```
GET    /api/v1/payments/batches
POST   /api/v1/payments/batches      # Initiate bulk payment
GET    /api/v1/payments/batches/:id
POST   /api/v1/payments/batches/:id/retry-failed

GET    /api/v1/payments/:payslipId
```

### 7.7 Reports
```
GET    /api/v1/reports/attendance
GET    /api/v1/reports/payroll
GET    /api/v1/reports/leave
```

---

## 8. Key Integration Points

### 8.1 Ethiopian Payment Infrastructure
- **Bank Integration**: CBE (Commercial Bank of Ethiopia), Awash Bank, Dashen Bank APIs for bulk salary transfers
- **Mobile Money**: Ethio Telecom's Telebirr integration

### 8.2 Compliance Hooks (for researcher to fill)
- Ethiopian Labor Law working hour limits
- Overtime calculation rules
- Holiday pay rates
- Pension contribution rates (7% employee, 11% employer) - *Corrected as per Procl. 1268/2022*
- Income tax brackets (progressive rates)

---

## 9. Security Considerations

- JWT with 15-minute access token expiry + 7-day refresh tokens
- Role-based access control (RBAC) on all endpoints
- Attendance location data encrypted at rest
- Audit logging for payroll approvals
- PIN/biometric for mobile check-in (future)

---

## 10. Database Indexes (Performance)

```sql
-- Attendance queries by date/user
CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, date);

-- Payroll runs by period
CREATE INDEX idx_payroll_runs_period ON payroll_runs(organization_id, payroll_period_start, payroll_period_end);

-- Payment batch status
CREATE INDEX idx_payment_batches_status ON payment_batches(organization_id, status);

-- Leave requests by status
CREATE INDEX idx_leave_requests_status ON leave_requests(status) WHERE status = 'pending';
```

---

## 11. Next Steps (Deferred to Researcher)

1. **Tax & Pension Logic**: Ethiopian income tax brackets and pension contribution rates
2. **Working Hours**: Legal overtime rules, weekly rest requirements
3. **Payment Integration**: API documentation for Ethiopian banks
4. **Compliance Checklist**: What makes employment contracts legally valid in Ethiopia

---

*Document Version: 1.0*
*Created by: agent-engineer*
*Date: 2026-05-07*