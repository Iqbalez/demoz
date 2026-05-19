-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "latitude" DECIMAL(10,8),
ADD COLUMN     "longitude" DECIMAL(11,8);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "ussdPin" VARCHAR(4) DEFAULT '1234';

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "checkInTime" TIMESTAMPTZ(6) NOT NULL,
    "checkOutTime" TIMESTAMPTZ(6),
    "checkInLatitude" DECIMAL(10,8),
    "checkInLongitude" DECIMAL(11,8),
    "checkOutLatitude" DECIMAL(10,8),
    "checkOutLongitude" DECIMAL(11,8),
    "checkInMethod" VARCHAR(50) NOT NULL,
    "checkOutMethod" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL,
    "complianceInfraction" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_tenantId_idx" ON "attendance"("tenantId");

-- CreateIndex
CREATE INDEX "attendance_employeeId_idx" ON "attendance"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE INDEX "attendance_tenantId_date_idx" ON "attendance"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employeeId_date_key" ON "attendance"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
