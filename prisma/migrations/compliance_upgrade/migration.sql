-- Migration: add_tin_pensionid_allowances_holidays
-- Generated from schema changes based on docs/ compliance audit
-- 
-- Changes:
-- 1. tenants: Add TIN field (required for ERCA/SIGTAS employer tax reporting)
-- 2. employees: Add tin, pensionId, transportAllowance, positionAllowance
-- 3. payroll_line_items: Add new financial columns (transport exempt, gross, employer pension, overtime)
-- 4. public_holidays: New table for Ethiopian holiday calendar (Labor Proclamation 1156/2019)

-- 1. Add TIN to tenants table
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "tin" VARCHAR(20);

COMMENT ON COLUMN "tenants"."tin" IS 'Taxpayer Identification Number — mandatory for ERCA/SIGTAS employer tax filings';

-- 2. Add compliance fields to employees table
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "tin"                 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "pension_id"          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "transport_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "position_allowance"  DECIMAL(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN "employees"."tin"                 IS 'Employee Taxpayer Identification Number — required for ERCA/SIGTAS monthly tax filing';
COMMENT ON COLUMN "employees"."pension_id"          IS 'POESSA Pension ID — required for monthly pension contribution reporting';
COMMENT ON COLUMN "employees"."transport_allowance" IS 'Non-taxable up to 25% of basic salary or 2,200 ETB (whichever is lower)';
COMMENT ON COLUMN "employees"."position_allowance"  IS 'Taxable position/responsibility allowance';

-- 3. Add new financial columns to payroll_line_items
ALTER TABLE "payroll_line_items"
  ADD COLUMN IF NOT EXISTS "transport_allowance"          DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "transport_allowance_exempt"   DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overtime_pay"                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "gross_salary"                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "employer_pension_contribution" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill gross_salary for existing records (base + old taxableAllowances)
UPDATE "payroll_line_items"
  SET "gross_salary" = "base_salary" + "taxable_allowances"
  WHERE "gross_salary" = 0;

-- Backfill employer pension (11% of min(baseSalary, 15000)) for existing records
UPDATE "payroll_line_items"
  SET "employer_pension_contribution" = ROUND(LEAST("base_salary", 15000) * 0.11, 2)
  WHERE "employer_pension_contribution" = 0;

COMMENT ON COLUMN "payroll_line_items"."gross_salary"                  IS 'Base salary + all allowances + overtime';
COMMENT ON COLUMN "payroll_line_items"."employer_pension_contribution"  IS '11% employer POESSA share (audit trail)';

-- 4. Create public_holidays table (Ethiopian holiday calendar)
-- Source: docs/ethiopia_2026_holidays.md
CREATE TABLE IF NOT EXISTS "public_holidays" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "date"          DATE NOT NULL,
  "name_en"       VARCHAR(150) NOT NULL,
  "name_am"       VARCHAR(150),
  "ethiopic_date" VARCHAR(50),
  "multiplier"    DECIMAL(3,1) NOT NULL DEFAULT 2.5,
  "year"          INTEGER NOT NULL,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "public_holidays_date_year_key" UNIQUE ("date", "year")
);

CREATE INDEX IF NOT EXISTS "public_holidays_year_idx" ON "public_holidays" ("year");
CREATE INDEX IF NOT EXISTS "public_holidays_date_idx" ON "public_holidays" ("date");

COMMENT ON TABLE "public_holidays" IS 'Ethiopian public holidays per Labor Proclamation 1156/2019. Used for 2.5x overtime multiplier calculation.';

-- 5. Seed 2026 Ethiopian holidays (from docs/ethiopia_2026_holidays.md)
INSERT INTO "public_holidays" ("date", "name_en", "name_am", "ethiopic_date", "multiplier", "year") VALUES
  ('2026-01-07', 'Ethiopian Christmas (Genna)',              'ገና',                           '29 Tahsas 2018',   2.5, 2026),
  ('2026-01-19', 'Orthodox Epiphany (Timkat)',               'ጥምቀት',                         '11 Tir 2018',      2.5, 2026),
  ('2026-03-02', 'Victory of Adwa Day',                     'የአድዋ ድል ቀን',                   '23 Yekatit 2018',  2.5, 2026),
  ('2026-03-20', 'Eid al-Fitr',                             'ዒድ አል-ፊጥር',                    '11 Megabit 2018',  2.5, 2026),
  ('2026-04-10', 'Ethiopian Good Friday (Siklet)',           'ስቅለት',                         '02 Miazia 2018',   2.5, 2026),
  ('2026-04-12', 'Ethiopian Easter (Fasika)',                'ፋሲካ',                          '04 Miazia 2018',   2.5, 2026),
  ('2026-05-01', 'International Workers'' Day',             'የሰራተኞች ቀን',                     '23 Miazia 2018',   2.5, 2026),
  ('2026-05-05', 'Ethiopian Patriots'' Victory Day',        'የአርበኞች ቀን',                     '27 Miazia 2018',   2.5, 2026),
  ('2026-05-28', 'Downfall of the Derg / Eid al-Adha',     'ደርግ የወደቀበት ቀን / ዒድ አል-አድሃ',  '20 Ginbot 2018',   2.5, 2026),
  ('2026-08-25', 'Mawlid (Birthday of Prophet Muhammad)',   'መውሊድ',                         '19 Nehasse 2018',  2.5, 2026),
  ('2026-09-11', 'Ethiopian New Year (Enkutatash)',          'እንቁጣጣሽ',                       '01 Meskerem 2019', 2.5, 2026),
  ('2026-09-27', 'Meskel (Finding of the True Cross)',      'መስቀል',                          '17 Meskerem 2019', 2.5, 2026)
ON CONFLICT ("date", "year") DO NOTHING;

-- 6. Create leave_types table
CREATE TABLE IF NOT EXISTS "leave_types" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"          UUID NOT NULL,
  "name"               VARCHAR(100) NOT NULL,
  "code"               VARCHAR(20) NOT NULL,
  "max_days_per_year"  INTEGER NOT NULL,
  "requires_approval"  BOOLEAN NOT NULL DEFAULT TRUE,
  "is_paid"            BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "leave_types_tenant_id_code_key" UNIQUE ("tenant_id", "code"),
  CONSTRAINT "leave_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
);

-- 7. Create leave_requests table
CREATE TABLE IF NOT EXISTS "leave_requests" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,
  "employee_id"      UUID NOT NULL,
  "leave_type_id"    UUID NOT NULL,
  "start_date"       DATE NOT NULL,
  "end_date"         DATE NOT NULL,
  "total_days"       INTEGER NOT NULL,
  "reason"           TEXT,
  "status"           VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  "approved_by_id"   UUID,
  "approved_at"      TIMESTAMPTZ(6),
  "rejection_reason" TEXT,
  "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "leave_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
  CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE,
  CONSTRAINT "leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types" ("id") ON DELETE CASCADE,
  CONSTRAINT "leave_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "leave_requests_tenant_id_status_idx" ON "leave_requests" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_employee_id_idx" ON "leave_requests" ("employee_id");
