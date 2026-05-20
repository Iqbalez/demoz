import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Ethiopian Overtime Calculation Service
 * 
 * Implements Labor Proclamation No. 1156/2019 overtime rules:
 * 
 * Multipliers (per docs/ethiopia_compliance_research.md & compliance_guide_for_hr.md):
 *   - Daytime OT (6 AM - 10 PM):  1.5x regular hourly rate
 *   - Nighttime OT (10 PM - 6 AM): 1.75x regular hourly rate
 *   - Weekly Rest Day:              2.0x regular hourly rate
 *   - Public Holiday:               2.5x regular hourly rate
 * 
 * Legal Caps:
 *   - Maximum 2 hours per day
 *   - Maximum 20 hours per month
 *   - Maximum 100 hours per year
 * 
 * Standard work: 8 hours/day, 48 hours/week (6 days)
 */

export interface OvertimeResult {
  totalOvertimeHours: number;
  overtimePay: number;
  violations: OvertimeViolation[];
  breakdown: {
    daytimeHours: number;
    nighttimeHours: number;
    restDayHours: number;
    holidayHours: number;
  };
}

export interface OvertimeViolation {
  type: 'DAILY_LIMIT' | 'MONTHLY_LIMIT' | 'YEARLY_LIMIT';
  message: string;
  date?: string;
  actualHours: number;
  limitHours: number;
}

@Injectable()
export class OvertimeService {
  private readonly logger = new Logger(OvertimeService.name);

  // Legal overtime caps per Labor Proclamation 1156/2019
  private readonly MAX_DAILY_OT_HOURS = 2;
  private readonly MAX_MONTHLY_OT_HOURS = 20;
  private readonly MAX_YEARLY_OT_HOURS = 100;

  // Standard working day
  private readonly STANDARD_DAILY_HOURS = 8;

  // Multipliers per docs/ethiopia_compliance_research.md
  private readonly MULTIPLIERS = {
    DAYTIME: 1.5,    // 6 AM - 10 PM
    NIGHTTIME: 1.75, // 10 PM - 6 AM
    REST_DAY: 2.0,   // Weekly rest day (typically Sunday)
    HOLIDAY: 2.5,    // Public holidays
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate overtime pay and violations for an employee in a given period.
   * Uses attendance records and the public holiday calendar.
   */
  async calculateOvertime(
    employeeId: string,
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    baseSalary: number,
  ): Promise<OvertimeResult> {
    // Hourly rate = Monthly Salary / (48 hours/week * 4.33 weeks/month) ≈ 208 hours
    const hourlyRate = baseSalary / 208;

    // Fetch attendance records for the period
    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        tenantId,
        date: { gte: periodStart, lte: periodEnd },
        checkOutTime: { not: null },
      },
      orderBy: { date: 'asc' },
    });

    // Fetch public holidays for the period
    const holidays = await this.prisma.publicHoliday.findMany({
      where: {
        date: { gte: periodStart, lte: periodEnd },
      },
    });
    const holidayDates = new Set(
      holidays.map(h => h.date.toISOString().split('T')[0])
    );

    let totalOvertimeHours = 0;
    let totalOvertimePay = 0;
    const violations: OvertimeViolation[] = [];
    const breakdown = { daytimeHours: 0, nighttimeHours: 0, restDayHours: 0, holidayHours: 0 };

    for (const record of attendances) {
      if (!record.checkOutTime) continue;

      const checkIn = new Date(record.checkInTime);
      const checkOut = new Date(record.checkOutTime);
      const workedMs = checkOut.getTime() - checkIn.getTime();
      const workedHours = workedMs / (1000 * 60 * 60);

      // Calculate overtime beyond 8 standard hours
      const otHours = Math.max(0, workedHours - this.STANDARD_DAILY_HOURS);
      
      if (otHours <= 0) continue;

      // Cap daily overtime at legal limit but record violation
      const cappedOtHours = Math.min(otHours, this.MAX_DAILY_OT_HOURS);
      if (otHours > this.MAX_DAILY_OT_HOURS) {
        violations.push({
          type: 'DAILY_LIMIT',
          message: `Employee worked ${otHours.toFixed(1)}h OT on ${record.date} (limit: ${this.MAX_DAILY_OT_HOURS}h)`,
          date: record.date.toISOString().split('T')[0],
          actualHours: otHours,
          limitHours: this.MAX_DAILY_OT_HOURS,
        });
      }

      // Determine which multiplier applies
      const dateStr = record.date.toISOString().split('T')[0];
      const dayOfWeek = new Date(record.date).getDay(); // 0 = Sunday

      let multiplier: number;
      if (holidayDates.has(dateStr)) {
        // Public holiday takes precedence (docs/ethiopia_2026_holidays.md: "holiday multiplier takes precedence over weekend")
        multiplier = this.MULTIPLIERS.HOLIDAY;
        breakdown.holidayHours += cappedOtHours;
      } else if (dayOfWeek === 0) {
        // Sunday = weekly rest day
        multiplier = this.MULTIPLIERS.REST_DAY;
        breakdown.restDayHours += cappedOtHours;
      } else {
        // Determine day vs night based on checkout time
        const checkOutHour = checkOut.getHours();
        if (checkOutHour >= 22 || checkOutHour < 6) {
          multiplier = this.MULTIPLIERS.NIGHTTIME;
          breakdown.nighttimeHours += cappedOtHours;
        } else {
          multiplier = this.MULTIPLIERS.DAYTIME;
          breakdown.daytimeHours += cappedOtHours;
        }
      }

      totalOvertimeHours += cappedOtHours;
      totalOvertimePay += cappedOtHours * hourlyRate * multiplier;
    }

    // Check monthly limit
    if (totalOvertimeHours > this.MAX_MONTHLY_OT_HOURS) {
      violations.push({
        type: 'MONTHLY_LIMIT',
        message: `Monthly overtime ${totalOvertimeHours.toFixed(1)}h exceeds legal limit of ${this.MAX_MONTHLY_OT_HOURS}h`,
        actualHours: totalOvertimeHours,
        limitHours: this.MAX_MONTHLY_OT_HOURS,
      });
    }

    this.logger.log(
      `Overtime calculated for employee ${employeeId}: ${totalOvertimeHours.toFixed(1)}h, pay: ${totalOvertimePay.toFixed(2)} ETB, violations: ${violations.length}`,
    );

    return {
      totalOvertimeHours,
      overtimePay: Math.round(totalOvertimePay * 100) / 100,
      violations,
      breakdown,
    };
  }
}
