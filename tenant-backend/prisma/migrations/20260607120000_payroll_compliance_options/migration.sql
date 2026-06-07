ALTER TABLE "payroll_configs" ADD COLUMN IF NOT EXISTS "complianceMode" VARCHAR(50) NOT NULL DEFAULT 'LEGAL';
ALTER TABLE "payroll_configs" ADD COLUMN IF NOT EXISTS "flexiblePayrollOptions" JSONB;
