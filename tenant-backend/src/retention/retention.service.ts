import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDataRetentionPolicy() {
    this.logger.log('Executing Data Retention Policy (Automated Purge)...');
    
    const THIRTY_DAYS_AGO = new Date();
    THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

    const SEVEN_YEARS_AGO = new Date();
    SEVEN_YEARS_AGO.setFullYear(SEVEN_YEARS_AGO.getFullYear() - 7);

    try {
      // 1. Delete granular Attendance Logs older than 30 days
      const deletedLogs = await this.prisma.attendanceLog.deleteMany({
        where: {
          timestamp: {
            lt: THIRTY_DAYS_AGO,
          },
        },
      });
      this.logger.log(`Purged ${deletedLogs.count} AttendanceLog records older than 30 days.`);

      // 2. Nullify GPS coordinates on standard Attendance records older than 30 days
      const updatedAttendance = await this.prisma.attendance.updateMany({
        where: {
          date: {
            lt: THIRTY_DAYS_AGO,
          },
          OR: [
            { checkInLatitude: { not: null } },
            { checkOutLatitude: { not: null } }
          ]
        },
        data: {
          checkInLatitude: null,
          checkInLongitude: null,
          checkOutLatitude: null,
          checkOutLongitude: null,
        },
      });
      this.logger.log(`Nullified exact GPS coordinates on ${updatedAttendance.count} Attendance records older than 30 days.`);

      // 3. Delete terminated employee profiles older than 7 years
      const deletedEmployees = await this.prisma.employee.deleteMany({
        where: {
          status: 'TERMINATED',
          updatedAt: {
            lt: SEVEN_YEARS_AGO,
          },
        },
      });
      this.logger.log(`Purged ${deletedEmployees.count} Terminated Employee profiles older than 7 years.`);
      
    } catch (error) {
      this.logger.error('Error executing Data Retention Policy:', error);
    }
  }
}
