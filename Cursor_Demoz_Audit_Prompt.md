# DEMOZ CODEBASE AUDIT & PRODUCTION-READY FIXES PROMPT FOR CURSOR

**Instructions:** Paste this entire prompt into Cursor's AI chat along with your codebase. Tell Cursor to analyze, fix, and implement everything below.

---

## MISSION

You are a SaaS architect auditing the Demoz codebase against a production-ready blueprint. Your job is to:

1. **AUDIT** — Check if each component is implemented the way the blueprint specifies
2. **IDENTIFY GAPS** — Find missing features, security issues, and anti-patterns
3. **FIX & IMPLEMENT** — Update existing code to best practices AND add all missing features
4. **MAKE PRODUCTION-READY** — Zero technical debt, full compliance, complete feature set

You will output:
- A detailed audit report (what exists, what's missing, what's wrong)
- Fixed/updated code files
- New feature implementations
- Configuration files and environment setup

---

## PART 1: CODEBASE AUDIT CHECKLIST

### A. FRONTEND (Next.js 14 + React + TypeScript)

- [ ] **Framework Version**: Is it Next.js 14 with App Router (not Pages Router)?
  - Fix if using older version or Pages Router
  - Ensure `tsconfig.json` has `"paths": {"@/*": ["./src/*"]}` for clean imports

- [ ] **TypeScript Setup**: 
  - Strict mode enabled: `"strict": true`
  - No `any` types without `// @ts-expect-error` comments
  - All API responses have Zod schemas

- [ ] **State Management**:
  - Using Zustand (not Redux, not Context for global state)
  - If missing: Create `/lib/store/` with attendance session + payroll draft stores
  - Each store has TypeScript interfaces, not magic objects

- [ ] **Form Handling**:
  - Using React Hook Form + Zod for validation
  - If missing: Implement in employee onboarding, payroll inputs
  - All forms have client-side AND server-side validation (Zod schemas shared)

- [ ] **UI Component Library**:
  - Using shadcn/ui (not Material-UI, not custom components)
  - If missing: Run `npx shadcn-ui@latest init` and add Button, Card, Input, Select, Dialog, Table, Badge
  - All components are accessible (ARIA labels, keyboard nav)

- [ ] **Real-Time Features**:
  - WebSocket implementation (Socket.io or native ws)
  - Payroll disbursement status updates in real-time
  - If missing: Implement Socket.io with `/lib/socket.ts` client

- [ ] **Amharic Localization**:
  - Using next-intl or i18next
  - Amharic JSON translations in `/public/locales/am.json`
  - UI toggle between Amharic and English
  - If missing: Implement complete Amharic language file

- [ ] **Styling**:
  - Using Tailwind CSS 3.4+ (not CSS Modules mixed with Tailwind)
  - shadcn/ui components use Tailwind utility classes
  - Dark mode support (if needed for admin dashboard)

- [ ] **Performance**:
  - TanStack Query (React Query) for server state management
  - Attendance/payroll data cached with 30-second stale time
  - Dynamic imports for large features (payroll wizard)
  - Images optimized with next/image component

- [ ] **Code Structure**:
  - Folder structure matches blueprint: `/app`, `/components`, `/lib`, `/hooks`, `/types`
  - No components deeper than 2 levels of nesting
  - Custom hooks in `/hooks` directory, not in components

- [ ] **Environment Variables**:
  - `.env.local` has all required vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
  - No secrets in `.env.local` (those go in `.env.local.example`)
  - Validates at build time with Zod

---

### B. BACKEND (Node.js 20 + Fastify 4)

- [ ] **Framework & Runtime**:
  - Node.js 20 LTS (check `package.json` engines field)
  - Fastify 4.x (not Express, not Hapi)
  - If using Express: Migrate to Fastify (better performance, built-in validation)

- [ ] **TypeScript**:
  - Full TypeScript, no JavaScript files
  - Strict mode, no implicit any
  - All API routes typed with Fastify type safety
  - Request/response schemas validated with JSON Schema or Zod

- [ ] **Database ORM**:
  - Using Prisma 5+ (not raw SQL, not Sequelize)
  - Schema at `/prisma/schema.prisma`
  - All multi-tenant queries filtered by `companyId` from JWT
  - Prisma middleware enforces companyId filter globally

- [ ] **API Route Structure**:
  - All routes under `/src/routes/v1/` directory
  - Routes organized by domain: `auth.ts`, `employees.ts`, `attendance.ts`, `payroll.ts`, `tax.ts`, `payments.ts`, `webhooks.ts`
  - Each route file has Fastify route handler with type safety
  - All routes have request validation (Zod or JSON Schema)

- [ ] **Authentication**:
  - JWT with RS256 signing (not HS256)
  - Access token: 15-minute expiry
  - Refresh token: 30-day expiry, HttpOnly cookie
  - Refresh token blocklist in Redis on logout
  - No plaintext passwords anywhere

- [ ] **Password Hashing**:
  - Using bcrypt with cost factor 12
  - If cost < 12: Update to 12
  - Never log passwords, never send in API responses

- [ ] **Authorization & RBAC**:
  - Route guards that check JWT role: OWNER, HR, EMPLOYEE, SUPER_ADMIN
  - Multi-tenant enforcement: companyId from JWT, not from request body
  - If missing: Implement Fastify plugin `/src/plugins/auth.ts` with route guards

- [ ] **Tax Engine**:
  - Pure function at `/src/lib/tax-engine/erca.ts`
  - Implements all 7 ERCA tax brackets exactly as blueprint specifies
  - Handles transport allowance exemption (up to 600 ETB)
  - Calculates employee pension (7%) and employer pension (11%)
  - Returns: taxableIncome, incomeTax, employeePension, employerPension, netSalary, bracket
  - If missing: CREATE THIS IMMEDIATELY
  - Has 30+ unit tests covering all bracket boundaries

- [ ] **Chapa Integration**:
  - Chapa API client at `/src/lib/chapa/client.ts`
  - Methods: `initiateBulkTransfer()`, `getTransferStatus()`, `webhookVerify()`
  - Bulk transfer reference format: `DEMOZ-{payrollRunId}-{employeeId}`
  - Webhook handler validates HMAC-SHA256 signature
  - If missing: Implement Chapa integration immediately

- [ ] **Background Jobs**:
  - BullMQ for payroll disbursement jobs (Redis-backed queue)
  - If missing: Implement `npm install bullmq` with job handler at `/src/jobs/payroll-disburse.ts`
  - Retry logic with exponential backoff (max 3 retries)
  - Job completion emits WebSocket event to HR dashboard

- [ ] **WebSocket/Real-Time**:
  - Socket.io server running alongside Fastify
  - Rooms: `company:{companyId}` for payroll status updates
  - If missing: Add Socket.io integration with `/src/lib/socket.ts`

- [ ] **Logging**:
  - Using Pino logger (fast, structured JSON logging)
  - If using console.log: Replace with Pino
  - All logs include timestamp, level, context
  - Sensitive data (passwords, TINs, bank accounts) NEVER logged

- [ ] **Error Handling**:
  - Fastify error handler catches all errors
  - Returns proper HTTP status codes (400, 401, 403, 404, 500)
  - Client never sees internal error details
  - All errors logged to Sentry or similar

- [ ] **Monitoring & Error Tracking**:
  - Sentry (or similar) integration for exception tracking
  - All uncaught errors sent to Sentry
  - If missing: Add `npm install @sentry/node` and configure

- [ ] **API Rate Limiting**:
  - Fastify rate-limit plugin: 100 req/min per IP, 1000 req/min per authenticated user
  - If missing: Implement `npm install @fastify/rate-limit`

- [ ] **CORS Configuration**:
  - Fastify CORS plugin with strict allowlist (only Demoz frontend domains)
  - No wildcard origins
  - Credentials: true for cookie-based auth

- [ ] **Input Validation**:
  - All request bodies validated with Zod schemas
  - Unknown fields stripped, not passed through
  - All query parameters validated
  - All path parameters typed and validated

- [ ] **Database Migrations**:
  - Using Prisma migrations
  - All migrations versioned and safe to roll forward/backward
  - Schema has proper indexes on companyId, employeeId, date fields
  - If missing: Run `prisma migrate dev` to generate

- [ ] **Audit Logging**:
  - All payroll approvals logged with who, when, IP address, all figures
  - All salary modifications logged with before/after values
  - Tax calculations stored immutably in TaxCalculation table
  - If missing: Create AuditLog table and middleware

- [ ] **Environment Variables**:
  - All secrets in `.env` (never in code)
  - `.env.example` documents all required vars
  - Validates at startup with Zod
  - Includes: `DATABASE_URL`, `CHAPA_SECRET_KEY`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `REDIS_URL`, `SENTRY_DSN`

- [ ] **Testing**:
  - Unit tests for tax engine with 30+ cases
  - Integration tests for API endpoints
  - Using Vitest or Jest
  - If missing: Add test files for critical paths

---

### C. DATABASE (PostgreSQL 15)

- [ ] **Prisma Schema**:
  - All entities defined: Company, User, Employee, AttendanceRecord, LeaveRequest, PayrollRun, PayrollItem, TaxCalculation, BulkPayment
  - Multi-tenant: every entity except User has `companyId` field
  - Proper relationships with `@relation` annotations
  - Unique constraints on appropriate fields (TIN, bank account, etc.)

- [ ] **Data Types**:
  - Monetary amounts as `Decimal` (not Float), with 2 decimal places
  - Dates as `DateTime @default(now())`
  - Employee name stored in both English and Amharic
  - Enums for status fields: ContractType, LeaveType, PaymentStatus, PayrollStatus

- [ ] **Indexes**:
  - Indexes on `companyId` (all tables)
  - Indexes on `employeeId` (AttendanceRecord, PayrollItem)
  - Indexes on `date` (AttendanceRecord)
  - Indexes on `status` (PayrollRun, PayrollItem)

- [ ] **Constraints**:
  - Foreign key constraints enforced
  - Unique constraint: User.email per company
  - Check constraint: transportAllowance >= 0, housingAllowance >= 0
  - Check constraint: netSalary >= 0 (no negative pay)

- [ ] **Migrations**:
  - All schema changes via `prisma migrate dev` (not raw SQL)
  - Migration files versioned and reproducible
  - No data loss migrations without explicit `@ignore`

---

### D. MOBILE APP (React Native + Expo 51)

- [ ] **Setup**:
  - Expo SDK 51 with managed workflow
  - `app.json` properly configured
  - EAS Build configured for Google Play and App Store

- [ ] **Core Features**:
  - Employee clock-in with GPS location capture (expo-location)
  - Biometric unlock (expo-local-authentication)
  - Offline attendance sync (AsyncStorage)
  - View payslips (from backend API)

- [ ] **Localization**:
  - Amharic language support (react-i18next)
  - Language toggle in app settings
  - All strings externalized (no hardcoded text)

- [ ] **Navigation**:
  - Using React Navigation (not custom navigation)
  - Stack navigator for auth (login, register, forgot password)
  - Tab navigator for main app (Clock In, Payslips, Leave, Settings)

- [ ] **State Management**:
  - Zustand for global state (same as web app)
  - Zustand persistence for offline support

- [ ] **API Communication**:
  - Shared API client with web app
  - Axios or Fetch with interceptors for auth
  - Shared Zod schemas for request/response validation

- [ ] **If Missing** (likely case):
  - Create scaffolding with Expo CLI
  - Implement clock-in screen with GPS
  - Implement payslip viewer
  - Implement settings with language toggle

---

### E. CHAPA INTEGRATION

- [ ] **Credentials**:
  - `CHAPA_SECRET_KEY` in `.env`
  - `CHAPA_WEBHOOK_SECRET` in `.env`
  - Both are long random strings, not exposed to frontend

- [ ] **API Client**:
  - File at `/src/lib/chapa/client.ts`
  - Function `initiateBulkTransfer(payrollRunId, month, year, companyName, recipients)`
  - Returns: `{ bulkRef: string, status: string }`
  - Handles Chapa API response and error cases

- [ ] **Webhook Handler**:
  - Endpoint: `POST /api/v1/webhooks/chapa`
  - Verifies HMAC-SHA256 signature of request
  - Updates PayrollItem.paymentStatus based on event status
  - Emits Socket.io event to company room
  - If missing: Implement immediately

- [ ] **Error Handling**:
  - If Chapa API is unavailable: job queued for retry
  - BullMQ handles retries with exponential backoff
  - Transient failures don't fail the payroll run

- [ ] **Testing**:
  - Chapa sandbox environment configured
  - Test transfer with 5-10 dummy recipients
  - Webhook signature verification tested

---

### F. TAX ENGINE

- [ ] **Implementation**:
  - File: `/src/lib/tax-engine/erca.ts`
  - Exported function: `calculateTax(employee: { baseSalary, transportAllowance, housingAllowance, overtime }): TaxResult`
  - Returns all fields: taxableIncome, incomeTax, employeePension, employerPension, netSalary, bracket

- [ ] **Brackets**:
  - 7 brackets hardcoded or in database table
  - Transport allowance exemption: up to 600 ETB/month
  - Employee pension: 7% of base salary only
  - Employer pension: 11% of base salary only
  - Pension reduces taxable income

- [ ] **Rounding**:
  - All monetary amounts rounded to 2 decimal places
  - No floating point errors (use `Decimal` type in database)
  - Tax and pension calculations match Ethiopian accounting standards

- [ ] **Tests**:
  - 30+ test cases covering:
    - All bracket boundaries (0, 600, 601, 1650, 1651, etc.)
    - Transport allowance exemption (599, 600, 601 ETB)
    - Pension calculations
    - High earners (50,000+ ETB)
  - Test file at `/src/lib/tax-engine/erca.test.ts`
  - All tests passing before production

- [ ] **If Missing**:
  - Create the tax engine FIRST before anything else
  - This is non-negotiable — ERCA errors expose clients to massive penalties

---

### G. SECURITY & COMPLIANCE

- [ ] **Encryption in Transit**:
  - TLS 1.3 enforced (no TLS 1.0/1.1)
  - HSTS header set to max-age >= 31536000
  - All HTTP redirects to HTTPS
  - Certificate from Let's Encrypt (auto-renewed)

- [ ] **Encryption at Rest**:
  - Sensitive fields encrypted at database column level (TINs, bank accounts)
  - Using Prisma middleware with AES-256-GCM
  - If missing: Implement encryption middleware

- [ ] **Authentication**:
  - RS256 JWT signing (not HS256)
  - Private/public key pair in environment variables
  - If using HS256: Migrate to RS256 immediately

- [ ] **Authorization**:
  - Multi-tenant companyId filter on all queries
  - RBAC enforced at API route level
  - If missing: Implement Fastify plugin `/src/plugins/auth.ts`

- [ ] **API Security**:
  - CORS strict allowlist (no wildcards)
  - Rate limiting: 100 req/min per IP, 1000 req/min per user
  - CSRF protection (double-submit cookie or tokens)
  - Input validation: Zod schemas on all endpoints

- [ ] **Audit Logging**:
  - All payroll approvals logged
  - All salary modifications logged
  - All login attempts logged
  - Failed login sequences trigger alerts

- [ ] **Data Privacy (PDPP Compliance)**:
  - Employee data retention policy: 5 years post-termination (ERCA requirement), then purge
  - Data access controls: employees see only their own data
  - Right to access: self-service data export
  - Right to erasure: automated purge after 5 years
  - DPA with Chapa, Cloudinary, Redis hosting provider

- [ ] **Secrets Management**:
  - No hardcoded secrets
  - `.env` in `.gitignore`
  - `.env.example` documents all required vars
  - Secrets rotated every 90 days
  - If using plaintext in code: Move to env immediately

---

### H. INFRASTRUCTURE & DEVOPS

- [ ] **Hosting**:
  - Currently on Railway.app (or equivalent)
  - Managed PostgreSQL with automated backups
  - Managed Redis (Upstash for serverless option)

- [ ] **CI/CD Pipeline**:
  - GitHub Actions or equivalent
  - Runs on: `push main` and `pull_request`
  - Steps: lint, type-check, unit tests, integration tests, build, deploy
  - If missing: Create `.github/workflows/deploy.yml`

- [ ] **Testing**:
  - Unit tests for tax engine, utils, hooks
  - Integration tests for API endpoints
  - E2E tests for critical user flows (if possible)
  - If missing: Add test files and GitHub Actions step

- [ ] **Monitoring**:
  - Sentry for error tracking
  - Better Uptime or similar for uptime monitoring (pings every minute)
  - Custom dashboard for business metrics (MRR, churn, payroll runs)
  - If missing: Add Sentry and uptime monitoring

- [ ] **Backup Strategy**:
  - Automated daily database backups (Railway provides this)
  - Weekly manual pg_dump to external storage (Cloudflare R2)
  - If missing: Add backup script

- [ ] **Environment Management**:
  - Separate `.env` files for dev, staging, production
  - Staging environment mirrors production (same secrets, same data subset)
  - If missing: Configure staging environment on Railway

---

## PART 2: FEATURE COMPLETENESS CHECKLIST

### Must-Have Features (Core MVP)

- [ ] **Attendance Tracking**
  - [ ] GPS-based clock-in (mobile web or app)
  - [ ] Manual clock-in (for offline scenarios)
  - [ ] Biometric unlock (native mobile)
  - [ ] Real-time attendance dashboard (admin)
  - [ ] Attendance reports by employee/date
  - [ ] Late minutes, early leave minutes calculation
  - [ ] Approval workflow (HR approves, owner views)

- [ ] **Payroll Processing**
  - [ ] Employee CRUD (add, edit, deactivate)
  - [ ] Payroll run creation (select month, generate draft)
  - [ ] Automatic ERCA tax calculation
  - [ ] Pension contributions (7% employee, 11% employer)
  - [ ] Payroll approval workflow (HR creates draft, owner approves)
  - [ ] Payslip generation (PDF and email/SMS)
  - [ ] Payroll history and reports

- [ ] **Bulk Disbursement**
  - [ ] Chapa integration (bulk transfer API)
  - [ ] One-click disbursement to all employees
  - [ ] Real-time payment status tracking (WebSocket)
  - [ ] Automatic retry on Chapa failures (BullMQ)
  - [ ] Payment confirmation (SMS to employees)
  - [ ] Failed payment alerts to HR/owner

- [ ] **Tax Compliance**
  - [ ] ERCA-formatted reports (Excel/PDF)
  - [ ] Tax calculations stored immutably (audit trail)
  - [ ] Monthly tax summary by employee
  - [ ] Tax bracket management (admin can update ERCA brackets)
  - [ ] Pension contribution tracking

- [ ] **User Management & RBAC**
  - [ ] Owner account (view all data, approve payroll)
  - [ ] HR manager account (create payroll, manage attendance, cannot approve)
  - [ ] Employee account (view own payslips, clock in, request leave)
  - [ ] Super admin (Demoz team, view all companies)
  - [ ] Role-based route guards

- [ ] **Multi-Tenant Data Isolation**
  - [ ] Each company sees only its own data
  - [ ] companyId filter on all database queries
  - [ ] Integration tests for data isolation
  - [ ] No cross-company data leakage

### Should-Have Features (Q2-Q3)

- [ ] **Leave Management**
  - [ ] Leave types: Annual, Sick, Maternity, Emergency
  - [ ] Ethiopian Labor Law leave entitlements (15 days annual, 5 days sick, etc.)
  - [ ] Leave request submission by employee
  - [ ] Approval by HR/owner
  - [ ] Leave balance tracking
  - [ ] Deduct leave from working days in attendance

- [ ] **Overtime & Allowances**
  - [ ] Overtime calculation (1.25x for standard OT)
  - [ ] Transport allowance (auto-set per company)
  - [ ] Housing allowance (auto-set per company)
  - [ ] Hardship allowance (configurable)
  - [ ] Automatic calculation in payroll

- [ ] **Employee Self-Service Portal**
  - [ ] View own payslips (current and past)
  - [ ] Download tax certificates (for personal use, ERCA)
  - [ ] Submit leave requests
  - [ ] View own attendance record
  - [ ] Update personal info (phone, address)
  - [ ] Change password

- [ ] **Analytics & Reporting**
  - [ ] Payroll cost trends (by month, by department)
  - [ ] Attendance heatmap (who's consistently late)
  - [ ] Tax withholding trends
  - [ ] Turnover tracking (who left, when)
  - [ ] Custom date range reports

- [ ] **Amharic Language Support**
  - [ ] Full admin dashboard in Amharic
  - [ ] Payslips in Amharic (employee names, amounts)
  - [ ] SMS notifications in Amharic
  - [ ] Email templates in Amharic
  - [ ] Help docs in Amharic

---

## PART 3: IMPLEMENTATION INSTRUCTIONS

### Step 1: Run This Audit
For each section above, check if the code implements what's specified. Mark completed features with ✅, mark gaps with ❌.

### Step 2: Fix Gaps Systematically
**Priority order (do not skip):**
1. Tax engine (ERCA calculations) — if missing, implement immediately
2. Database schema (multi-tenant, all entities)
3. Authentication (JWT, RBAC, password hashing)
4. Chapa integration (webhook handler, bulk transfer)
5. API routes (all endpoints typed, validated)
6. Frontend (Next.js 14, shadcn/ui, TanStack Query)
7. Real-time updates (WebSocket, Socket.io)
8. Mobile app (React Native, Expo, clock-in)
9. Additional features (leave management, self-service, analytics)

### Step 3: Code Quality
- Fix all TypeScript errors (no implicit any)
- Add missing error handling (try-catch, Fastify error handler)
- Add validation to all API inputs (Zod schemas)
- Add tests for critical paths (tax engine, auth, multi-tenant isolation)
- Remove console.log, replace with Pino logger
- Add environment variable validation at startup

### Step 4: Security & Compliance
- No plaintext passwords, no secrets in code
- Multi-tenant companyId filter on ALL queries
- RBAC guards on all routes
- Input validation on all endpoints
- Audit logging for sensitive operations

### Step 5: Production Readiness
- No `TODO` or `FIXME` comments left in code
- All features tested (unit, integration, manual)
- Monitoring configured (Sentry, uptime, business metrics)
- Backup strategy implemented
- Database indexes added
- Rate limiting configured
- CORS properly configured
- Error handling covers all edge cases

---

## PART 4: FILE STRUCTURE EXPECTED

After all fixes, your codebase should look like:

```
demoz/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth pages
│   │   ├── (dashboard)/
│   │   │   ├── admin/              # Demoz admin
│   │   │   ├── hr/                 # HR manager
│   │   │   ├── owner/              # Business owner
│   │   │   └── employee/           # Employee self-service
│   │   ├── api/
│   │   │   └── v1/                 # API routes
│   │   │       ├── auth.ts
│   │   │       ├── employees.ts
│   │   │       ├── attendance.ts
│   │   │       ├── payroll.ts
│   │   │       ├── tax.ts
│   │   │       ├── payments.ts
│   │   │       └── webhooks/
│   │   │           └── chapa.ts
│   │   └── layout.tsx              # Root layout
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── attendance/
│   │   ├── payroll/
│   │   ├── tax/
│   │   └── charts/
│   ├── lib/
│   │   ├── tax-engine/
│   │   │   ├── erca.ts             # Tax calculation logic
│   │   │   ├── erca.test.ts        # 30+ test cases
│   │   │   └── types.ts
│   │   ├── chapa/
│   │   │   ├── client.ts
│   │   │   └── webhooks.ts
│   │   ├── db.ts                   # Prisma client
│   │   ├── auth.ts                 # Auth helpers
│   │   ├── socket.ts               # Socket.io client
│   │   ├── api.ts                  # API client (Axios)
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAttendance.ts
│   │   └── usePayroll.ts
│   ├── store/
│   │   ├── attendance.ts           # Zustand store
│   │   └── payroll.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── payroll.ts
│   │   └── api.ts
│   ├── styles/
│   │   └── globals.css             # Tailwind
│   └── middleware.ts               # Next.js middleware (auth, role-based routing)
├── backend/                        # Optional if separate Node.js backend
│   ├── src/
│   │   ├── server.ts               # Fastify server entry
│   │   ├── plugins/
│   │   │   ├── auth.ts             # Auth plugin with RBAC
│   │   │   └── cors.ts
│   │   ├── routes/
│   │   │   └── v1/
│   │   │       ├── auth.ts
│   │   │       ├── employees.ts
│   │   │       ├── attendance.ts
│   │   │       ├── payroll.ts
│   │   │       ├── tax.ts
│   │   │       ├── payments.ts
│   │   │       └── webhooks.ts
│   │   ├── jobs/
│   │   │   └── payroll-disburse.ts # BullMQ job handler
│   │   ├── lib/
│   │   │   ├── tax-engine/         # Same as frontend
│   │   │   ├── chapa/
│   │   │   └── logger.ts           # Pino logger
│   │   ├── types/
│   │   └── middleware/
│   │       └── auth.ts             # Auth middleware
│   └── package.json
├── mobile/                         # React Native + Expo
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── clock-in.tsx
│   │   │   ├── payslips.tsx
│   │   │   ├── leave.tsx
│   │   │   └── settings.tsx
│   │   └── _layout.tsx
│   ├── lib/
│   │   ├── api.ts                  # Shared API client
│   │   ├── tax-engine/             # Shared tax logic
│   │   └── store.ts                # Shared Zustand store
│   ├── locales/
│   │   ├── en.json
│   │   └── am.json                 # Amharic
│   ├── app.json
│   └── eas.json
├── .env.example                    # Document all required env vars
├── .env.local                      # Never commit, dev only
├── package.json                    # Frontend deps
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── README.md                       # Setup instructions
```

---

## PART 5: WHAT TO TELL CURSOR

Copy this into Cursor AI chat along with your codebase:

```
You are a SaaS architect auditing the Demoz codebase against a production-ready blueprint. 

Here's the audit checklist: [PASTE PART 1 ABOVE]

For each section:
1. Tell me what's currently implemented and what's missing
2. Identify any code that doesn't match best practices
3. Fix or update existing code to match the blueprint
4. Implement all missing features
5. Add proper error handling, validation, and security

Start with the highest priority items:
- Tax engine (ERCA calculations)
- Database schema and multi-tenant isolation
- Authentication and RBAC
- Chapa integration
- API routes

Then move to secondary features. Focus on production-readiness: no TODOs, full validation, proper error handling, all tests passing.

Generate fixed code files and new files for any missing features.
```

---

## CRITICAL NOTES

1. **Tax Engine**: If this doesn't exist, build it FIRST. Everything else depends on it being correct. ERCA penalties destroy client trust.

2. **Multi-Tenant Security**: Every single database query must filter by `companyId` from the JWT. This is non-negotiable. Add integration tests to verify no cross-company data leakage.

3. **Chapa Webhook**: Must verify HMAC-SHA256 signature. Any unverified webhook handler can be spoofed and cause payment issues.

4. **No Skipping Security**: Don't defer authentication, RBAC, or encryption. These are foundational.

5. **Tests for Tax Calculations**: 30+ test cases covering all bracket boundaries. A single bracket bug exposes clients to massive ERCA penalties.

6. **Amharic Support**: Not optional if targeting Ethiopian market. UI strings must be externalized and translated.

7. **TypeScript Strict Mode**: No implicit any, no workarounds. Catches whole classes of bugs.

8. **Environment Variables**: All secrets in `.env`, never in code. Validate at startup with Zod.

---

## END PROMPT

**Now paste your codebase into Cursor and ask it to complete this audit and implement all fixes.**
