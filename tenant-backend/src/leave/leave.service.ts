import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { EthiopianCalendarService } from '../shared/ethiopian-calendar/ethiopian-calendar.service';

export class CreateLeaveTypeDto {
  name: string;
  code: string;
  maxDaysPerYear: number;
  requiresApproval?: boolean;
  isPaid?: boolean;
}

export class CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
    private readonly ethiopianCalendar: EthiopianCalendarService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // LEAVE ENTITLEMENT PER PROCLAMATION 1156/2019
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Annual leave entitlement per Ethiopian Labour Proclamation 1156/2019:
   * Year 1: 16 working days
   * Year 2: 18 working days
   * Year 3+: 20 working days (increases by 1 day per additional year, max 30)
   */
  getAnnualLeaveEntitlement(yearsOfService: number): number {
    if (yearsOfService <= 1) return 16;
    if (yearsOfService === 2) return 18;
    return Math.min(20 + (yearsOfService - 3), 30);
  }

  /**
   * Calculate working days between two dates, excluding weekends and public holidays.
   * Ethiopian standard: Sunday is the weekly rest day.
   */
  calculateWorkingDays(startDate: Date, endDate: Date): number {
    let totalDays = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const day = current.getDay();
      // Exclude Sundays (0) — Ethiopian standard rest day
      if (day !== 0) {
        // Exclude public holidays
        if (!this.ethiopianCalendar.isPublicHoliday(current)) {
          totalDays++;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return totalDays;
  }

  /**
   * Validate leave request against balance before approving.
   */
  async validateLeaveBalance(
    employeeId: string,
    leaveDays: number,
    leaveTypeCode: string,
  ): Promise<{ valid: boolean; remaining: number; entitlement: number; message?: string }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        hireDate: true,
        leaveBalanceUsed: true,
        leaveYear: true,
      },
    });

    if (!employee) {
      return { valid: false, remaining: 0, entitlement: 0, message: 'Employee not found.' };
    }

    if (leaveTypeCode === 'AL') {
      // Calculate years of service
      const hireDate = new Date(employee.hireDate);
      const now = new Date();
      const yearsOfService = Math.floor((now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const entitlement = this.getAnnualLeaveEntitlement(yearsOfService);
      const remaining = entitlement - (employee.leaveBalanceUsed || 0);

      if (leaveDays > remaining) {
        return {
          valid: false,
          remaining,
          entitlement,
          message: `Insufficient annual leave balance. ${remaining} days remaining out of ${entitlement}.`,
        };
      }
      return { valid: true, remaining: remaining - leaveDays, entitlement };
    }

    // For other leave types, just validate against max days
    return { valid: true, remaining: 0, entitlement: 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEED & CRUD OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Seed default Ethiopian labor law leave types for a tenant.
   * Based on Proclamation 1156/2019.
   */
  async seedDefaultLeaveTypes(tenantId: string) {
    const defaults = [
      { name: 'Annual Leave / ዓመታዊ ፈቃድ', code: 'AL', maxDaysPerYear: 16, requiresApproval: true, isPaid: true },
      { name: 'Sick Leave / የህመም ፈቃድ', code: 'SL', maxDaysPerYear: 180, requiresApproval: true, isPaid: true },
      { name: 'Maternity Leave / የወሊድ ፈቃድ', code: 'ML', maxDaysPerYear: 120, requiresApproval: true, isPaid: true },
      { name: 'Paternity Leave / የአባት ፈቃድ', code: 'PL', maxDaysPerYear: 3, requiresApproval: true, isPaid: true },
      { name: 'Bereavement Leave / የሐዘን ፈቃድ', code: 'BL', maxDaysPerYear: 7, requiresApproval: true, isPaid: true },
      { name: 'Unpaid Leave / ያለ ደሞዝ ፈቃድ', code: 'UL', maxDaysPerYear: 30, requiresApproval: true, isPaid: false },
    ];

    const results: any[] = [];
    for (const type of defaults) {
      const created = await this.prisma.leaveType.upsert({
        where: { tenantId_code: { tenantId, code: type.code } },
        update: {},
        create: {
          tenantId,
          ...type,
        },
      });
      results.push(created);
    }
    return results;
  }

  async getLeaveTypes(tenantId: string) {
    let types = await this.prisma.leaveType.findMany({
      where: { tenantId },
    });
    if (!types.length) {
      await this.seedDefaultLeaveTypes(tenantId);
      types = await this.prisma.leaveType.findMany({ where: { tenantId } });
    }
    return types;
  }

  async getLeaveRequestsForEmployee(tenantId: string, employeeId: string, status?: string) {
    const whereClause: Record<string, unknown> = { tenantId, employeeId };
    if (status) whereClause.status = status;
    return this.prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        leaveType: { select: { name: true, code: true } },
        approvedBy: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestLeave(tenantId: string, dto: CreateLeaveRequestDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date.');
    }

    // Calculate working days excluding weekends + public holidays
    const totalDays = this.calculateWorkingDays(start, end);

    if (totalDays === 0) {
      throw new BadRequestException('The selected period contains no working days.');
    }

    // Get leave type code for validation
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
      select: { code: true },
    });

    if (leaveType?.code === 'AL') {
      const validation = await this.validateLeaveBalance(dto.employeeId, totalDays, 'AL');
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
    }

    // Check overlap
    const existing = await this.prisma.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Leave request overlaps with an existing pending or approved request.');
    }

    const request = await this.prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason: dto.reason,
      },
    });

    await this.dashboardService.invalidateTenantKPICache(tenantId);

    return request;
  }

  async getLeaveRequests(tenantId: string, status?: string) {
    const whereClause: any = { tenantId };
    if (status) {
      whereClause.status = status;
    }
    return this.prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeIdNumber: true, phoneNumber: true } },
        leaveType: { select: { name: true, code: true } },
        approvedBy: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveLeave(tenantId: string, requestId: string, adminUserId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: { select: { phoneNumber: true, firstName: true, leaveBalanceUsed: true } },
        leaveType: { select: { code: true } },
      },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found.');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be approved.');
    }

    const updatedRequest = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedById: adminUserId,
        approvedAt: new Date(),
      },
    });

    // Update leave balance for Annual Leave
    if (request.leaveType.code === 'AL') {
      await this.prisma.employee.update({
        where: { id: request.employeeId },
        data: {
          leaveBalanceUsed: (request.employee.leaveBalanceUsed || 0) + request.totalDays,
        },
      });
    }

    // SMS notification via Afromessage
    this.sendLeaveNotification(
      request.employee.phoneNumber,
      `Your leave request for ${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)} has been approved. / የእርስዎ ፈቃድ ተፈቅዷል።`,
    );

    await this.dashboardService.invalidateTenantKPICache(tenantId);

    return updatedRequest;
  }

  async rejectLeave(tenantId: string, requestId: string, reason: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: { select: { phoneNumber: true, firstName: true } },
      },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found.');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be rejected.');
    }

    const updatedRequest = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    // SMS notification via Afromessage
    this.sendLeaveNotification(
      request.employee.phoneNumber,
      `Your leave request for ${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)} was not approved. Reason: ${reason || 'Not provided'} / የእርስዎ ፈቃድ አልተፈቀደም።`,
    );

    await this.dashboardService.invalidateTenantKPICache(tenantId);

    return updatedRequest;
  }

  /**
   * Get leave balance summary for an employee.
   */
  async getLeaveBalance(tenantId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: {
        hireDate: true,
        leaveBalanceUsed: true,
        leaveYear: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const hireDate = new Date(employee.hireDate);
    const now = new Date();
    const yearsOfService = Math.floor((now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const entitlement = this.getAnnualLeaveEntitlement(yearsOfService);
    const used = employee.leaveBalanceUsed || 0;
    const remaining = entitlement - used;

    return {
      yearsOfService,
      entitlement,
      used,
      remaining,
      leaveYear: employee.leaveYear,
    };
  }

  /**
   * Calculate working days for a date range (API endpoint for frontend preview).
   */
  async calculateWorkingDaysForRange(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid dates provided.');
    }
    const workingDays = this.calculateWorkingDays(start, end);
    const holidays = this.ethiopianCalendar.getPublicHolidays(start.getFullYear())
      .filter(h => h.date >= start && h.date <= end)
      .map(h => ({ name: h.name, amharic: h.amharic, date: h.date.toISOString().slice(0, 10) }));

    return { workingDays, holidays };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SMS NOTIFICATION (Afromessage integration)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send SMS notification via Afromessage API.
   * Gracefully logs errors without blocking the leave workflow.
   */
  private async sendLeaveNotification(phoneNumber: string, message: string) {
    const apiKey = process.env.AFROMESSAGE_API_KEY;
    const senderId = process.env.AFROMESSAGE_SENDER_ID || 'Demoz';

    if (!apiKey) {
      this.logger.warn('AFROMESSAGE_API_KEY not configured. Skipping SMS notification.');
      return;
    }

    try {
      const response = await fetch('https://api.afromessage.com/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: senderId,
          to: phoneNumber,
          message,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Afromessage SMS failed for ${phoneNumber}: ${response.status}`);
      } else {
        this.logger.log(`SMS sent to ${phoneNumber}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, err);
    }
  }
}
