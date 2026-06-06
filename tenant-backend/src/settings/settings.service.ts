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
    const [payrollConfig, attendanceConfig, securityConfig, notificationConfig] =
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
        if (companyUpdateData.tin && !/^\\d{10}$/.test(companyUpdateData.tin)) {
           throw new BadRequestException('TIN must be exactly 10 digits.');
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
      pensionCap: 5000,
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

  private getDefaultIntegrationConfig() {
    return {
      chapaConnected: false,
      cbeAccountNumber: null,
      awashAccountNumber: null,
      ercaRegistrationNumber: null,
      psssaRegistrationNumber: null,
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
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where: { tenantId } }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
