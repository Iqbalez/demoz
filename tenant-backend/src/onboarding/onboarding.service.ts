import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { AfromessageService } from '../notifications/afromessage.service';
import { CsvParserService } from './csv-parser.service';
import { generateTemporaryPassword, generateUniqueEmail } from './credential-generator';
import { EmployeeStatus, UserRole } from '@prisma/client';

export interface ImportResult {
  imported: number;
  failed: number;
  details: Array<{ email: string; status: 'success' | 'failed'; error?: string }>;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly afromessageService: AfromessageService,
    private readonly csvParserService: CsvParserService,
  ) {}

  async importEmployeesFromCSV(tenantId: string, csvBuffer: Buffer): Promise<ImportResult> {
    const rows = await this.csvParserService.parseEmployeeCSV(csvBuffer);
    const total = rows.length;
    const details: ImportResult['details'] = [];
    const existingSystemEmails = new Set<string>();

    // Pre-load existing system emails for this tenant to avoid duplicates
    const existingUsers = await this.prisma.user.findMany({
      where: { tenantId },
      select: { email: true },
    });
    existingUsers.forEach((u) => existingSystemEmails.add(u.email));

    // Ensure there is a default "Onboarding" branch + department for CSV imports
    // This is the Option B adaptation: we resolve/create the department dynamically
    let defaultBranch = await this.prisma.branch.findFirst({
      where: { tenantId, name: 'Main Branch' },
    });
    if (!defaultBranch) {
      defaultBranch = await this.prisma.branch.create({
        data: {
          tenantId,
          name: 'Main Branch',
          location: 'Headquarters',
        },
      });
    }

    for (const row of rows) {
      // Rows with validation errors are recorded as failed immediately
      if (row.errors && row.errors.length > 0) {
        details.push({
          email: row.email || 'unknown',
          status: 'failed',
          error: row.errors.join('; '),
        });
        continue;
      }

      try {
        // Resolve or auto-create the department by name
        let department = await this.prisma.department.findFirst({
          where: { tenantId, name: row.department },
        });
        if (!department) {
          department = await this.prisma.department.create({
            data: {
              tenantId,
              branchId: defaultBranch.id,
              name: row.department,
            },
          });
        }

        // Generate credentials
        const temporaryPassword = generateTemporaryPassword();
        const systemEmail = generateUniqueEmail(
          row.firstName,
          row.lastName,
          tenantId,
          existingSystemEmails,
        );
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);

        // Normalise phone: strip non-digits, ensure 10 digits minimum
        const normalPhone = row.phone.replace(/\D/g, '');
        const phoneNumber = normalPhone.startsWith('0') ? normalPhone : `0${normalPhone}`;

        // Generate a sequential employeeIdNumber
        const existingCount = await this.prisma.employee.count({ where: { tenantId } });
        const employeeIdNumber = `EMP${String(existingCount + 1).padStart(4, '0')}`;

        // Atomic Prisma $transaction: create User + Employee together
        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              tenantId,
              email: systemEmail,
              passwordHash,
              phoneNumber,
              role: UserRole.EMPLOYEE,
              isActive: true,
            },
          });

          await tx.employee.create({
            data: {
              tenantId,
              userId: user.id,
              departmentId: department.id,
              firstName: row.firstName,
              lastName: row.lastName,
              employeeIdNumber,
              phoneNumber,
              baseSalary: 0,   // HR will update via employee profile
              hireDate: new Date(),
              status: EmployeeStatus.ACTIVE,
            },
          });
        });

        // Fire-and-forget SMS — deliberately NOT awaited so import returns fast
        this.afromessageService
          .sendCredentialSMS(phoneNumber, systemEmail, temporaryPassword)
          .catch((err) =>
            this.logger.warn(`SMS fire-and-forget error for ${phoneNumber}: ${err?.message}`),
          );

        details.push({ email: row.email, status: 'success' });
      } catch (err: any) {
        this.logger.error(`Failed to import ${row.email}: ${err.message}`);
        details.push({ email: row.email, status: 'failed', error: err.message });
      }
    }

    const imported = details.filter((d) => d.status === 'success').length;
    const failed   = details.filter((d) => d.status === 'failed').length;

    console.log(`[Onboarding] Imported ${imported}/${total} employees for tenant ${tenantId}`);

    return { imported, failed, details };
  }

  async getOnboardingStatus(tenantId: string) {
    const [totalEmployees, activeEmployees] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId } }),
      this.prisma.employee.count({ where: { tenantId, status: EmployeeStatus.ACTIVE } }),
    ]);

    // "Pending first login" = EMPLOYEE-role users whose password has never been changed.
    // We approximate this by checking users created in the last 7 days with EMPLOYEE role,
    // since mustChangePassword is not in the schema (Option B).
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pendingInvites = await this.prisma.user.count({
      where: {
        tenantId,
        role: UserRole.EMPLOYEE,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    return { totalEmployees, activeEmployees, pendingInvites };
  }

  async sendCredentialReminder(tenantId: string, employeeId: string): Promise<void> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found for tenant ${tenantId}`);
    }
    if (!employee.user) {
      throw new NotFoundException(`No user account linked to employee ${employeeId}`);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await this.prisma.user.update({
      where: { id: employee.user.id },
      data: { passwordHash },
    });

    await this.afromessageService.sendCredentialSMS(
      employee.phoneNumber,
      employee.user.email,
      temporaryPassword,
    );

    this.logger.log(`Credential reminder sent to employee ${employeeId}`);
  }
}
