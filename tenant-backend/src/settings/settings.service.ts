import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SettingsModuleType } from './settings.controller';
import { AuditService } from './audit.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Upsert-on-read: guarantee config rows exist in DB before returning.
    // This prevents the phantom-defaults bug where in-memory defaults are
    // shown to the user but never persisted, causing silent data loss.
    const [payrollConfig, attendanceConfig, securityConfig, notificationConfig, integrationConfig] =
      await Promise.all([
        this.prisma.payrollConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultPayrollConfig(), tenantId },
          update: {},
        }),
        this.prisma.attendanceConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultAttendanceConfig(), tenantId },
          update: {},
        }),
        this.prisma.securityConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultSecurityConfig(), tenantId },
          update: {},
        }),
        this.prisma.notificationConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultNotificationConfig(), tenantId },
          update: {},
        }),
        this.prisma.integrationConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultIntegrationConfig(), tenantId },
          update: {},
        }),
      ]);

    // Mask Chapa API Key before returning
    if (integrationConfig && integrationConfig.chapaApiKey) {
      const keyLen = integrationConfig.chapaApiKey.length;
      integrationConfig.chapaApiKey = integrationConfig.chapaApiKey.substring(0, 8) + '*'.repeat(Math.max(0, keyLen - 12)) + integrationConfig.chapaApiKey.substring(keyLen - 4);
    }

    return {
      company: {
        name: tenant.name,
        industry: tenant.industry,
        companySize: tenant.companySize,
        registrationNumber: tenant.registrationNumber,
        tin: tenant.tin,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone,
        fiscalYearStart: tenant.fiscalYearStart,
        logoUrl: tenant.logoUrl,
      },
      payroll: payrollConfig,
      attendance: attendanceConfig,
      security: securityConfig,
      notifications: notificationConfig,
      integrations: integrationConfig,
    };
  }

  async updateSettings(tenantId: string, moduleName: SettingsModuleType, payload: any, userId?: string) {
    let result;

    switch (moduleName) {
      case 'company':
        // Update Tenant directly for company profile
        // Only allow specific fields
        const allowedCompanyFields = ['name', 'industry', 'companySize', 'registrationNumber', 'tin', 'contactEmail', 'contactPhone', 'fiscalYearStart', 'logoUrl'];
        const companyUpdateData: any = {};
        for (const field of allowedCompanyFields) {
          if (payload[field] !== undefined) {
            companyUpdateData[field] = payload[field];
          }
        }
        
        // Backend TIN Validation
        if (companyUpdateData.tin) {
          companyUpdateData.tin = String(companyUpdateData.tin).trim();
          if (companyUpdateData.tin && !/^\d{10}$/.test(companyUpdateData.tin)) {
            throw new BadRequestException('TIN must be exactly 10 digits.');
          }
        }

        result = await this.prisma.tenant.update({
          where: { id: tenantId },
          data: companyUpdateData,
        });
        break;

      case 'security':
        // using upsert to avoid race conditions
        const allowedSecurityFields = ['minPasswordLen', 'requireUppercase', 'requireNumber', 'requireSpecial', 'passwordExpiryDays', 'failedLoginLock', 'sessionTimeoutMins', 'allowMultiSession', 'require2FA'];
        const securityUpdateData: any = {};
        for (const field of allowedSecurityFields) {
          if (payload[field] !== undefined) {
            securityUpdateData[field] = payload[field];
          }
        }
        
        const defaultSecurity = this.getDefaultSecurityConfig();
        const securityCreateData = { ...defaultSecurity, ...securityUpdateData, tenantId };

        result = await this.prisma.securityConfig.upsert({
          where: { tenantId },
          create: securityCreateData,
          update: securityUpdateData,
        });
        break;

      case 'payroll':
        const allowedPayrollFields = [
          'pensionEmployee', 'pensionEmployer', 'pensionCap',
          'payFrequency', 'cutoffDay', 'payDate',
          'overtimeRate', 'nightShiftRate', 'nightShiftEnabled',
          'payslipTemplate', 'allowanceTypes', 'deductionTypes',
          'complianceMode', 'flexiblePayrollOptions',
        ];
        const payrollUpdateData: any = {};
        for (const field of allowedPayrollFields) {
          if (payload[field] !== undefined) {
            payrollUpdateData[field] = payload[field];
          }
        }
        result = await this.prisma.payrollConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultPayrollConfig(), ...payrollUpdateData, tenantId },
          update: payrollUpdateData,
        });
        break;

      case 'attendance':
        const allowedAttendanceFields = [
          'workHoursPerDay', 'workDays',
          'dailyOvertimeThresh', 'weeklyOvertimeThresh',
          'gracePeriodMins', 'autoAbsentMins',
          'offlineSync', 'shifts',
        ];
        const attendanceUpdateData: any = {};
        for (const field of allowedAttendanceFields) {
          if (payload[field] !== undefined) {
            attendanceUpdateData[field] = payload[field];
          }
        }
        result = await this.prisma.attendanceConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultAttendanceConfig(), ...attendanceUpdateData, tenantId },
          update: attendanceUpdateData,
        });
        break;
        
      case 'notifications':
        result = await this.prisma.notificationConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultNotificationConfig(), ...payload, tenantId },
          update: payload,
        });
        break;

      case 'integrations':
        const allowedIntegrationFields = [
          'chapaApiKey', 'chapaConnected', 'cbeAccountNumber',
          'awashAccountNumber', 'ercaRegistrationNumber', 'psssaRegistrationNumber'
        ];
        const integrationUpdateData: any = {};
        for (const field of allowedIntegrationFields) {
          if (payload[field] !== undefined) {
            integrationUpdateData[field] = payload[field];
          }
        }
        
        // If they send a masked key (e.g. "sk_test_***"), do not overwrite the real key.
        if (integrationUpdateData.chapaApiKey && integrationUpdateData.chapaApiKey.includes('***')) {
          delete integrationUpdateData.chapaApiKey;
        }

        result = await this.prisma.integrationConfig.upsert({
          where: { tenantId },
          create: { ...this.getDefaultIntegrationConfig(), ...integrationUpdateData, tenantId },
          update: integrationUpdateData,
        });
        break;
    }

    // Emit audit log
    if (userId) {
      await this.audit.log(tenantId, userId, `updated_${moduleName}_settings`, {
        module: moduleName,
        fields: Object.keys(payload),
      });
    }

    return result;
  }

  private getDefaultPayrollConfig() {
    return {
      pensionEmployee: 7.0,
      pensionEmployer: 11.0,
      pensionCap: 15000,
      payFrequency: 'MONTHLY',
      cutoffDay: 25,
      payDate: 28,
      overtimeRate: 1.25,
      nightShiftRate: 0,
      nightShiftEnabled: false,
      payslipTemplate: {
        showBasicSalary: true,
        showAllowances: true,
        showDeductions: true,
        showPension: true,
        showIncomeTax: true,
        showNetPay: true,
        showBankAccount: false,
        showEmployeeId: true,
        showDepartment: true,
        showPosition: true,
        logoPosition: 'TOP_LEFT',
        language: 'ENGLISH',
        footerText: '',
      },
      allowanceTypes: [],
      deductionTypes: [],
    };
  }

  private getDefaultAttendanceConfig() {
    return {
      workHoursPerDay: 8,
      workDays: ["MON","TUE","WED","THU","FRI","SAT"],
      dailyOvertimeThresh: 8,
      weeklyOvertimeThresh: 48,
      gracePeriodMins: 15,
      autoAbsentMins: 120,
      offlineSync: true,
      shifts: [],
    };
  }

  private getDefaultSecurityConfig() {
    return {
      minPasswordLen: 8,
      requireUppercase: true,
      requireNumber: true,
      requireSpecial: false,
      passwordExpiryDays: null,
      failedLoginLock: 5,
      sessionTimeoutMins: 60,
      allowMultiSession: true,
      require2FA: 'NONE',
    };
  }

  private getDefaultNotificationConfig() {
    return {
      payrollReminderDays: 3,
      leaveApprovalAlert: true,
      attendanceAnomalyAlert: true,
      taxRemittanceAlert: true,
    };
  }

  private getDefaultIntegrationConfig() {
    return {
      chapaConnected: false,
      cbeAccountNumber: null,
      awashAccountNumber: null,
      ercaRegistrationNumber: null,
      psssaRegistrationNumber: null,
    };
  }

  private getDefaultUserNotificationPreferences() {
    return {
      payrollReminderDays: 3,
      leaveApprovalAlert: true,
      attendanceAnomalyAlert: true,
      taxRemittanceAlert: true,
      subscriptionRenewalAlert: true,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
    };
  }

  async getNotificationSettings(tenantId: string, userId: string) {
    const [company, preferences] = await Promise.all([
      this.prisma.notificationConfig.upsert({
        where: { tenantId },
        create: { ...this.getDefaultNotificationConfig(), tenantId },
        update: {},
      }),
      this.prisma.userNotificationPreference.upsert({
        where: { tenantId_userId: { tenantId, userId } },
        create: { ...this.getDefaultUserNotificationPreferences(), tenantId, userId },
        update: {},
      }),
    ]);

    return { company, preferences };
  }

  async updateUserNotificationPreferences(tenantId: string, userId: string, payload: any) {
    const allowedFields = [
      'payrollReminderDays',
      'leaveApprovalAlert',
      'attendanceAnomalyAlert',
      'taxRemittanceAlert',
      'subscriptionRenewalAlert',
      'quietHoursEnabled',
      'quietHoursStart',
      'quietHoursEnd',
    ];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updateData[field] = payload[field];
      }
    }

    const result = await this.prisma.userNotificationPreference.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: { ...this.getDefaultUserNotificationPreferences(), ...updateData, tenantId, userId },
      update: updateData,
    });

    await this.audit.log(tenantId, userId, 'updated_user_notification_preferences', {
      fields: Object.keys(updateData),
    });

    return result;
  }

  async exportCompanyData(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: { select: { id: true, email: true, role: true, phoneNumber: true } },
        employees: true,
        payrollConfig: true,
        attendanceConfig: true,
        notificationConfig: true,
        integrationConfig: true,
        leaveTypes: true,
        departments: true,
        branches: true,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    return {
      exportedAt: new Date().toISOString(),
      tenant: {
        id: tenant.id,
        name: tenant.name,
        planTier: tenant.planTier,
        status: tenant.status,
      },
      users: tenant.users,
      employees: tenant.employees,
      settings: {
        payroll: tenant.payrollConfig,
        attendance: tenant.attendanceConfig,
        notifications: tenant.notificationConfig,
        integrations: tenant.integrationConfig,
      },
      leavePolicies: tenant.leaveTypes,
      departments: tenant.departments,
      branches: tenant.branches,
    };
  }

  // --- Leave Policies CRUD ---
  async getLeavePolicies(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createLeavePolicy(tenantId: string, payload: any, userId?: string) {
    const policy = await this.prisma.leaveType.create({
      data: {
        ...payload,
        tenantId,
      },
    });

    if (userId) {
      await this.audit.log(tenantId, userId, 'created_leave_policy', {
        policyId: policy.id,
        policyName: policy.name,
      });
    }

    return policy;
  }

  async updateLeavePolicy(tenantId: string, id: string, payload: any, userId?: string) {
    const policy = await this.prisma.leaveType.update({
      where: { id, tenantId },
      data: payload,
    });

    if (userId) {
      await this.audit.log(tenantId, userId, 'updated_leave_policy', {
        policyId: policy.id,
        policyName: policy.name,
        fields: Object.keys(payload),
      });
    }

    return policy;
  }

  async deleteLeavePolicy(tenantId: string, id: string, userId?: string) {
    const policy = await this.prisma.leaveType.findUnique({ where: { id, tenantId } });
    if (!policy) throw new BadRequestException('Leave policy not found');
    
    if (policy.isSystem) {
      throw new BadRequestException('Cannot delete system leave policies');
    }

    await this.prisma.leaveType.delete({
      where: { id, tenantId },
    });

    if (userId) {
      await this.audit.log(tenantId, userId, 'deleted_leave_policy', {
        policyId: policy.id,
        policyName: policy.name,
      });
    }

    return { success: true };
  }

  // --- Audit Logs ---
  // --- Audit Logs ---
  async getAuditLogs(tenantId: string, page: number = 1, limit: number = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where: { tenantId } }),
    ]);

    const data = rows.map((log) => {
      const metadata = (log.metadata || {}) as Record<string, unknown>;
      return {
        id: log.id,
        timestamp: log.createdAt,
        userId: log.userId,
        action: log.action,
        entity: typeof metadata.module === 'string' ? metadata.module : typeof metadata.entity === 'string' ? metadata.entity : null,
        entityId: typeof metadata.entityId === 'string' ? metadata.entityId : typeof metadata.policyId === 'string' ? metadata.policyId : null,
        ipAddress: typeof metadata.ipAddress === 'string' ? metadata.ipAddress : null,
        userAgent: typeof metadata.userAgent === 'string' ? metadata.userAgent : null,
        changes: metadata,
        user: log.user,
      };
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getTenantHolidays(tenantId: string, year?: number) {
    const yearNum = year ?? new Date().getFullYear();
    const start = new Date(Date.UTC(yearNum, 0, 1));
    const end = new Date(Date.UTC(yearNum, 11, 31));

    const [national, custom] = await Promise.all([
      this.prisma.publicHoliday.findMany({
        where: { year: yearNum },
        orderBy: { date: 'asc' },
      }),
      this.prisma.tenantHoliday.findMany({
        where: { tenantId, date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
      }),
    ]);

    return { year: yearNum, national, custom };
  }

  async createTenantHoliday(
    tenantId: string,
    data: { date: string; name: string },
    userId?: string,
  ) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Holiday name is required.');
    if (!data.date) throw new BadRequestException('Holiday date is required.');

    const date = new Date(`${data.date}T00:00:00.000Z`);

    const holiday = await this.prisma.tenantHoliday.create({
      data: {
        tenantId,
        date,
        name,
        isCustom: true,
        isObserved: true,
      },
    });

    if (userId) {
      await this.audit.log(tenantId, userId, 'CREATE', {
        module: 'holidays',
        entityId: holiday.id,
        name,
        date: data.date,
      });
    }

    return holiday;
  }

  async deleteTenantHoliday(tenantId: string, id: string, userId?: string) {
    const existing = await this.prisma.tenantHoliday.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new BadRequestException('Holiday not found.');

    await this.prisma.tenantHoliday.delete({ where: { id } });

    if (userId) {
      await this.audit.log(tenantId, userId, 'DELETE', {
        module: 'holidays',
        entityId: id,
        name: existing.name,
      });
    }

    return { success: true };
  }
}
