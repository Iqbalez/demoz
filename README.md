# Demoz B2B SaaS Platform

Demoz is a comprehensive, production-grade B2B SaaS platform designed to modernize workforce management, HR operations, payroll disbursement, and geo-fenced attendance tracking. It is built with a highly secure multi-tenant architecture, catering to businesses in Ethiopia and beyond.

## 🏗️ Architecture Overview

The Demoz platform consists of three primary, interconnected repositories configured as a monorepo structure:

1. **`tenant-backend` (NestJS Node.js Server)**
   - The central nervous system of the platform.
   - **Database**: PostgreSQL orchestrated via Prisma ORM.
   - **Security**: Features AES-256 field-level database encryption (via `prisma-field-encryption`), robust JWT authentication, Rate Limiting, and Idempotency guards to prevent duplicate transactions.
   - **Integrations**: Handles Chapa payment gateway simulations, subscription cron jobs, and USSD webhooks for offline attendance.
   - **Deployment**: Configured for Render deployment.

2. **`tenant-frontend` (Next.js 14 App Router)**
   - The administrative B2B dashboard where tenant owners and HR operators manage their workforce.
   - **Design**: Built with Tailwind CSS v4, featuring a "2026 Techno-Futurist" glassmorphic aesthetic.
   - **Features**: Real-time KPI overviews, Geofenced Branch Management, HR Directory, Payroll Calculation Engine, Leave Approvals, and Subscription/Billing Management.
   - **State**: Currently transitioning from heavy mock-data states to live API integration.

3. **`employee-mobile` (React Native / Expo)**
   - A brutally simple, low-friction mobile portal for the workforce.
   - **Capabilities**: Face/Touch ID Biometric bypass, offline-capable token rotation, and Geofenced GPS Clock-ins.
   - **Deployment**: Supports standalone APK generation via EAS (`eas build -p android`).

---

## 🚦 Current Real Stage of Development

*(Honest Assessment as of May 2026)*

**Backend (NestJS) — Stage: Release Candidate / Pre-Prod**
- ✅ **Core Architecture**: Prisma schema is stable. Multi-tenant relationships, encrypted fields (NINs, Salaries), and RBAC (Role-Based Access Control) are fully implemented.
- ✅ **Security**: Global exception filters, rate limits, and idempotency interceptors are active.
- ✅ **Business Logic**: Payroll generation engine, subscription expiries via cron, and attendance geofence validation are fully scripted.
- 🟡 **Pending**: Final end-to-end integration tests on live Chapa payment endpoints (currently mostly simulated).

**Frontend (Next.js) — Stage: Late Beta**
- ✅ **UI/UX**: The complete 2026 structural layout has been finalized. CSS cascade layer regressions (`@layer base/components`) preventing proper Tailwind utility application have been strictly resolved.
- ✅ **Routing**: Dashboard routes (Overview, Directory, Leave, Payroll, Reports, Billing) are built and protected.
- 🟡 **Data Hydration**: The app is actively in the middle of being hooked up to live API data. Some feature registries (like the AI Compliance Terminal or specific charts) may still display seeded mock states.

**Mobile App (Expo) — Stage: Late Beta**
- ✅ **Authentication**: SecureStore JWT management and Axios silent refresh token rotation are fully implemented.
- ✅ **UI**: Login screen and basic biometric hooks are active.
- 🔴 **Current Known Bottleneck**: Expo Environment Variable (`EXPO_PUBLIC_API_URL`) injection during standalone APK compilation can be flaky. The codebase includes hardcoded fallbacks to the Render production URL to bypass local build failures.

---

## 🔄 Development Workflow

### Local Setup
The project utilizes a root-level `package.json` primarily configured to script the backend, but the optimal workflow is to run the environments concurrently in separate terminal instances.

**1. Database & Backend**
```bash
cd tenant-backend
npx prisma generate
npx prisma db push
npm run start:dev
```
*Note: Ensure your `.env` contains the valid `DATABASE_URL` (Neon Tech/Supabase) and encryption keys.*

**2. Frontend Dashboard**
```bash
cd tenant-frontend
npm install
npm run dev
```
*Runs the Next.js Turbopack compiler on `http://localhost:3000` (or `3001` if occupied).*

**3. Mobile App**
```bash
cd employee-mobile
npm install
npx expo start -c
```
*Use the `-c` flag to clear Metro bundler caches. Scan with Expo Go, or press `a` for the Android emulator. **Crucial:** If testing against a local backend on an Android emulator, ensure your `.env` points to `http://10.0.2.2:3001` instead of `localhost`.*

### Building Mobile APKs
To generate a physical Android APK without going through the Play Store:
```bash
cd employee-mobile
eas build -p android --profile preview
```
*If EAS fails to inject environment variables, manually verify `utils/api.ts` fallback URLs before compiling.*

---

## 🛡️ Security & Compliance
- **Data Minimization**: API endpoints strip unnecessary metadata before broadcasting to the frontend.
- **Field Encryption**: Sensitive fields (like Employee Fayda Numbers and Base Salaries) are encrypted at rest using `prisma-field-encryption`.
- **Token Rotation**: The mobile app utilizes strict short-lived Access Tokens with rotating Refresh Tokens to mitigate session hijacking.

## 🚀 Next Immediate Steps
1. **Frontend Hydration**: Complete the removal of `useState` mock seeds in `DashboardContext.tsx` in favor of pure `react-query` or `SWR` fetches against the NestJS backend.
2. **Mobile Deployment**: Finalize the APK build with successful environment variable injection and deploy to test devices.
3. **Billing Production**: Transition the subscription module from `simulate-expiry` tests to the actual Chapa webhook listener.
