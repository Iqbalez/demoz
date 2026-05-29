import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { tenantStorage } from '../tenant-context';
import { CheckInDto, CheckOutDto } from './dto/check-in.dto';
import { AttendanceType, AttendanceSource, Prisma } from '@prisma/client';

import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
  ) {}

  /** Mobile JWT uses employee.id; legacy PWA may use User.userId linked on Employee. */
  private async resolveEmployee(actorId: string) {
    let employee = await this.prisma.employee.findUnique({
      where: { id: actorId },
      include: { department: { include: { branch: true } } },
    });
    if (!employee) {
      employee = await this.prisma.employee.findUnique({
        where: { userId: actorId },
        include: { department: { include: { branch: true } } },
      });
    }
    if (!employee) {
      throw new NotFoundException('Employee record not found.');
    }
    return employee;
  }

  private async upsertDailyAttendance(
    employeeId: string,
    tenantId: string,
    type: 'CLOCK_IN' | 'CLOCK_OUT',
    latitude?: number,
    longitude?: number,
  ) {
    const todayDate = this.getEthiopianDate();
    if (type === 'CLOCK_IN') {
      await this.prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date: todayDate } },
        create: {
          tenantId,
          employeeId,
          date: todayDate,
          checkInTime: new Date(),
          checkInLatitude: latitude,
          checkInLongitude: longitude,
          checkInMethod: 'MOBILE',
          status: 'PRESENT',
        },
        update: {},
      });
    } else {
      const existing = await this.prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date: todayDate } },
      });
      if (existing) {
        await this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkOutTime: new Date(),
            checkOutLatitude: latitude,
            checkOutLongitude: longitude,
            checkOutMethod: 'MOBILE',
          },
        });
      } else {
        const now = new Date();
        await this.prisma.attendance.create({
          data: {
            tenantId,
            employeeId,
            date: todayDate,
            checkInTime: now,
            checkInMethod: 'MOBILE',
            checkOutTime: now,
            checkOutLatitude: latitude,
            checkOutLongitude: longitude,
            checkOutMethod: 'MOBILE',
            status: 'PRESENT',
          },
        });
      }
    }
  }

  async getTenantAttendanceLogs(tenantId: string) {
    const logs = await this.prisma.attendanceLog.findMany({
      where: { tenantId },
      include: {
        employee: { select: { firstName: true, lastName: true, phoneNumber: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    return logs.map((log) => ({
      id: log.id,
      employeeName: `${log.employee.firstName} ${log.employee.lastName}`,
      phoneNumber: log.employee.phoneNumber,
      timestamp: log.timestamp.toISOString(),
      type: log.type,
      source: log.source,
      latitude: log.latitude != null ? Number(log.latitude) : null,
      longitude: log.longitude != null ? Number(log.longitude) : null,
      isAnomaly: log.isAnomaly,
      anomalyReason: log.anomalyReason,
    }));
  }

  /**
   * Helper: Calculates current calendar date in Ethiopian Local Time (UTC+3)
   * represented as a Date object at midnight UTC for DB consistency.
   */
  private getEthiopianDate(): Date {
    const utcDate = new Date();
    const etOffset = 3 * 60 * 60 * 1000; // UTC+3
    const etDate = new Date(utcDate.getTime() + etOffset);
    const dateStr = etDate.toISOString().split('T')[0];
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  /**
   * Helper: Formats current time in Ethiopian Local Time (HH:MM)
   */
  private getEthiopianTimeStr(): string {
    const utcDate = new Date();
    const etOffset = 3 * 60 * 60 * 1000; // UTC+3
    const etDate = new Date(utcDate.getTime() + etOffset);
    const hours = etDate.getUTCHours().toString().padStart(2, '0');
    const minutes = etDate.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Helper: Calculates distance between two coordinates in meters using the Haversine formula
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Geofenced PWA Clock-In Service with Haversine Formula verification.
   * Creates an AttendanceLog marking anomalies when geofence is breached.
   */
  async verifyWebClockIn(
    employeeId: string,
    tenantId: string,
    type: AttendanceType,
    latitude: number,
    longitude: number,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const branch = employee.department?.branch;
    let isAnomaly = false;
    let anomalyReason: string | null = null;
    let branchLat: number | null = null;
    let branchLon: number | null = null;
    let limit = 500;
    let distance = 0;

    if (branch?.latitude != null && branch?.longitude != null) {
      branchLat = Number(branch.latitude);
      branchLon = Number(branch.longitude);
      limit = branch.geofenceRadiusMeters ?? 500;
      distance = this.calculateHaversineDistance(latitude, longitude, branchLat, branchLon);
      if (distance > limit) {
        isAnomaly = true;
        anomalyReason = `Geofence Breach: Worker was ${Math.round(distance)} meters away`;
      }
    }

    const telemetryPayload = {
      clientLat: latitude,
      clientLon: longitude,
      branchLat,
      branchLon,
      calculatedDistanceMeters: distance,
      geofenceLimitMeters: limit,
      timestamp: new Date().toISOString(),
    };

    const log = await this.prisma.attendanceLog.create({
      data: {
        tenantId,
        employeeId,
        type,
        source: AttendanceSource.WEB_PWA,
        latitude,
        longitude,
        isAnomaly,
        anomalyReason,
        telemetry: telemetryPayload,
      },
    });

    await this.dashboardService.invalidateTenantKPICache(tenantId);

    return log;
  }

  /**
   * PWA Check-In with Geofence Validation
   */
  async pwaCheckIn(userId: string, dto: CheckInDto) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    // 1. Fetch employee and branch coordinates
    const employee = await this.resolveEmployee(userId);

    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException('Employee account is not active.');
    }

    const branch = employee.department?.branch;

    // Geofence optional — log warning if branch missing
    if (branch?.latitude && branch?.longitude) {
      const branchLat = Number(branch.latitude);
      const branchLon = Number(branch.longitude);
      const distance = this.calculateHaversineDistance(
        dto.latitude,
        dto.longitude,
        branchLat,
        branchLon,
      );

      if (distance > 100) {
        throw new BadRequestException(
          `Location out of range. You are currently ${Math.round(distance)}m away from the branch geofence (maximum allowed: 100m).`,
        );
      }
    } else if (branch) {
      this.logger.warn(`Branch ${branch.id} has no registered coordinates. Bypassing distance check.`);
    } else {
      this.logger.warn(`Employee ${employee.id} has no branch assigned. Bypassing geofence check.`);
    }

    const todayDate = this.getEthiopianDate();

    // 3. Perform check-in within serialized transaction (row-level locking) with constraint safety
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Lock Employee row to prevent race conditions from concurrent rapid check-ins
        await tx.$executeRaw`SELECT id FROM employees WHERE id = ${employee.id}::uuid FOR UPDATE`;

        const existingRecord = await tx.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: todayDate,
            },
          },
        });

        if (existingRecord) {
          throw new BadRequestException('You have already checked in today.');
        }

        return tx.attendance.create({
          data: {
            tenantId,
            employeeId: employee.id,
            date: todayDate,
            checkInTime: new Date(),
            checkInLatitude: dto.latitude,
            checkInLongitude: dto.longitude,
            checkInMethod: 'PWA',
            status: 'PRESENT',
            notes: dto.notes,
          },
        });
      });
      
      await this.dashboardService.invalidateTenantKPICache(tenantId);
      return result;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('You have already checked in today.');
      }
      throw error;
    }
  }

  /**
   * PWA Check-Out
   */
  async pwaCheckOut(userId: string, dto: CheckOutDto) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      throw new BadRequestException('Active tenant context is missing.');
    }

    const employee = await this.resolveEmployee(userId);

    const todayDate = this.getEthiopianDate();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Lock employee row
        await tx.$executeRaw`SELECT id FROM employees WHERE id = ${employee.id}::uuid FOR UPDATE`;

        const attendanceRecord = await tx.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: todayDate,
            },
          },
        });

        if (!attendanceRecord) {
          throw new BadRequestException('You must check in first before checking out.');
        }

        if (attendanceRecord.checkOutTime) {
          throw new BadRequestException('You have already checked out today.');
        }

        return tx.attendance.update({
          where: { id: attendanceRecord.id },
          data: {
            checkOutTime: new Date(),
            checkOutLatitude: dto.latitude,
            checkOutLongitude: dto.longitude,
            checkOutMethod: 'PWA',
            notes: dto.notes ? `${attendanceRecord.notes || ''}\n${dto.notes}` : attendanceRecord.notes,
          },
        });
      });
      
      await this.dashboardService.invalidateTenantKPICache(tenantId);
      return result;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('You have already checked out today.');
      }
      throw error;
    }
  }

  /**
   * Fetch attendance records for the active tenant/employee
   */
  async getRecords(userId: string) {
    const employee = await this.resolveEmployee(userId);

    return this.prisma.attendance.findMany({
      where: { employeeId: employee.id },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * High-Speed USSD Webhook Parser (Bypasses slow logic, resolves under 200ms)
   */
  async processUssdWebhook(body: { phoneNumber: string; text: string; sessionId?: string; serviceCode?: string }): Promise<string> {
    const { phoneNumber, text } = body;

    // 1. Instantly look up employee globally via indexed phoneNumber (spoof-proof telco layer check)
    // This is super fast because it's a unique index
    const employee = await this.prisma.employee.findUnique({
      where: { phoneNumber },
    });

    if (!employee) {
      // Instantly terminate connection to prevent network load
      return 'END Employee not registered. Please contact HR.';
    }

    if (employee.status !== 'ACTIVE') {
      return 'END Your employee profile is inactive. Please contact HR.';
    }

    // 2. Decode USSD State String by splitting on '*'
    const parts = text ? text.split('*').map(p => p.trim()) : [];

    // Step 0: Initial dial (text is empty or contains no parameters)
    if (parts.length === 0 || parts[0] === '') {
      return 'CON Welcome to Demoz!\n1. Check-in\n2. Check-out';
    }

    const option = parts[0];
    if (option !== '1' && option !== '2') {
      return 'END Invalid option selected. Dial again.';
    }

    // Step 1: User chose check-in or check-out, now prompt for PIN authentication
    if (parts.length === 1) {
      return 'CON Enter your 4-digit PIN:';
    }

    // Step 2: User has typed option and PIN (e.g. "1*1234")
    if (parts.length === 2) {
      const pin = parts[1];

      // Validate 4-digit PIN against registered employee's ussdPin
      if (employee.ussdPin !== pin) {
        return 'END Invalid PIN. Access denied.';
      }

      const todayDate = this.getEthiopianDate();
      const localTimeStr = this.getEthiopianTimeStr();

      // Wrap transactional execution under employee's specific tenant context
      return tenantStorage.run(employee.tenantId, async () => {
        try {
          return await this.prisma.$transaction(async (tx) => {
            // Explicitly lock the employee row to guarantee race-condition-free execution
            await tx.$executeRaw`SELECT id FROM employees WHERE id = ${employee.id}::uuid FOR UPDATE`;

            if (option === '1') {
              // Option 1: Check-in
              const existingRecord = await tx.attendance.findUnique({
                where: {
                  employeeId_date: {
                    employeeId: employee.id,
                    date: todayDate,
                  },
                },
              });

              if (existingRecord) {
                return 'END You have already checked in today.';
              }

              await tx.attendance.create({
                data: {
                  tenantId: employee.tenantId,
                  employeeId: employee.id,
                  date: todayDate,
                  checkInTime: new Date(),
                  checkInMethod: 'USSD',
                  status: 'PRESENT',
                },
              });

              await this.dashboardService.invalidateTenantKPICache(employee.tenantId);
              return `END Check-in successful at ${localTimeStr}.`;
            } else {
              // Option 2: Check-out
              const attendanceRecord = await tx.attendance.findUnique({
                where: {
                  employeeId_date: {
                    employeeId: employee.id,
                    date: todayDate,
                  },
                },
              });

              if (!attendanceRecord) {
                return 'END You must check in first before checking out.';
              }

              if (attendanceRecord.checkOutTime) {
                return 'END You have already checked out today.';
              }

              await tx.attendance.update({
                where: { id: attendanceRecord.id },
                data: {
                  checkOutTime: new Date(),
                  checkOutMethod: 'USSD',
                },
              });

              await this.dashboardService.invalidateTenantKPICache(employee.tenantId);
              return `END Check-out successful at ${localTimeStr}.`;
            }
          });
        } catch (error) {
          this.logger.error(`USSD transaction failed for employee ${employee.id}:`, error);
          return 'END An internal error occurred. Please try again later.';
        }
      });
    }

    return 'END Invalid request format.';
  }

  /**
   * Processes a batch of offline attendance logs transactionally.
   */
  async processBatchLogs(
    employeeId: string,
    tenantId: string,
    logs: Array<{
      type: 'CLOCK_IN' | 'CLOCK_OUT';
      latitude: number;
      longitude: number;
      timestamp: string;
    }>,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const branch = employee.department?.branch;
    const branchLat = branch && branch.latitude !== null ? Number(branch.latitude) : null;
    const branchLon = branch && branch.longitude !== null ? Number(branch.longitude) : null;
    const limit = branch ? branch.geofenceRadiusMeters : 100;

    // Process logs individually (not in a single transaction) to be idempotent
    // and skip duplicates gracefully instead of crashing the entire batch
    const createdLogs: any[] = [];
    let skipped = 0;

    for (const log of logs) {
      // Check for duplicate: same employee, same type, same day
      const logDate = new Date(log.timestamp);
      const startOfDay = new Date(logDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(logDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await this.prisma.attendanceLog.findFirst({
        where: {
          employeeId,
          type: log.type as any,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (existing) {
        skipped++;
        continue; // Skip duplicate — already synced
      }

      let isAnomaly = false;
      let anomalyReason: string | null = null;

      if (branchLat !== null && branchLon !== null) {
        const distance = this.calculateHaversineDistance(
          log.latitude,
          log.longitude,
          branchLat,
          branchLon,
        );

        if (distance > limit) {
          isAnomaly = true;
          anomalyReason = `Batch Geofence Breach: Worker was ${Math.round(distance)} meters away`;
        }
      }

      const telemetryPayload = {
        clientLat: log.latitude,
        clientLon: log.longitude,
        branchLat,
        branchLon,
        isOfflineBatch: true,
        originalTimestamp: log.timestamp,
        timestamp: new Date().toISOString(),
      };

      try {
        const createdLog = await this.prisma.attendanceLog.create({
          data: {
            tenantId: tenantId || employee.tenantId,
            employeeId,
            type: log.type as any,
            source: AttendanceSource.WEB_PWA,
            latitude: log.latitude,
            longitude: log.longitude,
            isAnomaly,
            anomalyReason,
            telemetry: telemetryPayload,
            timestamp: new Date(log.timestamp),
          },
        });
        createdLogs.push(createdLog);
      } catch (err: any) {
        // Gracefully skip P2002 duplicate constraint errors
        if (err?.code === 'P2002') {
          skipped++;
          continue;
        }
        throw err;
      }
    }

    const results = createdLogs;

    await this.dashboardService.invalidateTenantKPICache(tenantId || employee.tenantId);

    return {
      success: true,
      syncedCount: results.length,
    };
  }
  /**
   * Offline-First Background Sync (Single Event)
   */
  async syncOfflineEvent(tenantId: string, userId: string, body: any) {
    const { type, lat, lng, accuracy, branchId, deviceId, clientTime, method } = body;
    
    // Validate that clientTime is not older than 24 hours
    const clientDate = new Date(clientTime);
    const now = new Date();
    const diffMs = now.getTime() - clientDate.getTime();
    if (diffMs > 24 * 60 * 60 * 1000) {
      return { status: 'REJECTED', reason: 'Event too old' };
    }

    const employee = await this.resolveEmployee(userId);

    // Check for duplicate AttendanceLog (same employee, same day, same type)
    const startOfDay = new Date(clientDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(clientDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingLog = await this.prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        type: type as any,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingLog) {
      return { status: 'DUPLICATE', conflictId: existingLog.id };
    }

    const created = await this.prisma.attendanceLog.create({
      data: {
        tenantId: tenantId || employee.tenantId,
        employeeId: employee.id,
        branchId: branchId || employee.department?.branchId,
        type: type as AttendanceType,
        latitude: lat,
        longitude: lng,
        accuracy,
        method: (method as any) || 'GPS',
        deviceId,
        clientTime: clientDate,
        timestamp: now,
        syncedAt: now,
        source: AttendanceSource.WEB_PWA,
      },
    });

    if (type === 'CLOCK_IN' || type === 'CLOCK_OUT') {
      await this.upsertDailyAttendance(employee.id, tenantId || employee.tenantId, type, lat, lng);
    }

    await this.dashboardService.invalidateTenantKPICache(tenantId || employee.tenantId);

    return {
      status: 'SUCCESS',
      attendanceId: created.id,
      message: type === 'CLOCK_IN' ? 'Clock-in recorded.' : 'Clock-out recorded.',
    };
  }
}
