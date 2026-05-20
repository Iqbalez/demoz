import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed default Ethiopian labor law leave types for a tenant.
   * Based on Proclamation 1156/2019.
   */
  async seedDefaultLeaveTypes(tenantId: string) {
    const defaults = [
      { name: 'Annual Leave', code: 'AL', maxDaysPerYear: 16, requiresApproval: true, isPaid: true },
      { name: 'Sick Leave', code: 'SL', maxDaysPerYear: 180, requiresApproval: true, isPaid: true }, // 6 months total, varying pay
      { name: 'Maternity Leave', code: 'ML', maxDaysPerYear: 120, requiresApproval: true, isPaid: true },
      { name: 'Paternity Leave', code: 'PL', maxDaysPerYear: 3, requiresApproval: true, isPaid: true },
      { name: 'Bereavement Leave', code: 'BL', maxDaysPerYear: 7, requiresApproval: true, isPaid: true },
      { name: 'Marriage Leave', code: 'MRGL', maxDaysPerYear: 5, requiresApproval: true, isPaid: true },
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
    return this.prisma.leaveType.findMany({
      where: { tenantId },
    });
  }

  async requestLeave(tenantId: string, dto: CreateLeaveRequestDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date.');
    }

    // Rough approximation of working days (excluding weekends)
    let totalDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0) { // Exclude Sundays (rest day in Ethiopia typically)
        totalDays++;
      }
      current.setDate(current.getDate() + 1);
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

    return this.prisma.leaveRequest.create({
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
  }

  async getLeaveRequests(tenantId: string, status?: string) {
    const whereClause: any = { tenantId };
    if (status) {
      whereClause.status = status;
    }
    return this.prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeIdNumber: true } },
        leaveType: { select: { name: true, code: true } },
        approvedBy: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveLeave(tenantId: string, requestId: string, adminUserId: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request || request.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found.');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be approved.');
    }

    return this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedById: adminUserId,
        approvedAt: new Date(),
      },
    });
  }

  async rejectLeave(tenantId: string, requestId: string, reason: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request || request.tenantId !== tenantId) {
      throw new NotFoundException('Leave request not found.');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be rejected.');
    }

    return this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }
}
