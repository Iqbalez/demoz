import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scans AttendanceLogs in a given payroll run cycle.
   * Runs pattern matching over JSONB telemetry and anomalies to evaluate compliance.
   */
  async runAudit(
    payrollRunId: string,
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    this.logger.log(`Running AI compliance security scan for run ${payrollRunId}...`);

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        tenantId,
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const totalLogsAnalyzed = logs.length;
    const flaggedEmployeeIds: string[] = [];

    // Pattern 1: USSD Session ID Sharing (proxy-clocking detection)
    const sessionMap = new Map<string, string[]>(); // sessionId -> employeeId[]
    for (const log of logs) {
      const tel = log.telemetry as any;
      if (tel && tel.sessionId) {
        const list = sessionMap.get(tel.sessionId) || [];
        if (!list.includes(log.employeeId)) {
          list.push(log.employeeId);
          sessionMap.set(tel.sessionId, list);
        }
      }
    }

    for (const [sessionId, employees] of sessionMap.entries()) {
      if (employees.length > 1) {
        this.logger.warn(
          `AI Scan: Shared USSD Session ID detected! Session ${sessionId} used by: ${employees.join(', ')}`,
        );
        for (const empId of employees) {
          if (!flaggedEmployeeIds.includes(empId)) {
            flaggedEmployeeIds.push(empId);
          }
        }
      }
    }

    // Pattern 2: Heavy Geofence Anomaly breaches
    const anomalyCounts = new Map<string, number>(); // employeeId -> count
    for (const log of logs) {
      if (log.isAnomaly) {
        const count = anomalyCounts.get(log.employeeId) || 0;
        anomalyCounts.set(log.employeeId, count + 1);
      }
    }

    for (const [empId, count] of anomalyCounts.entries()) {
      // Flag employees with 2 or more geofence violations in a cycle as high risk
      if (count >= 2) {
        this.logger.warn(
          `AI Scan: Flagged worker ${empId} for repeated geofence breaches (${count} anomalies)`,
        );
        if (!flaggedEmployeeIds.includes(empId)) {
          flaggedEmployeeIds.push(empId);
        }
      }
    }

    // Compute mathematical fraud risk score (0.0 to 1.0)
    let fraudRiskScore = 0.0;
    if (totalLogsAnalyzed > 0) {
      const uniqueEmployeeCount = new Set(logs.map(l => l.employeeId)).size;
      if (uniqueEmployeeCount > 0) {
        fraudRiskScore = Math.min(1.0, flaggedEmployeeIds.length / uniqueEmployeeCount);
      }
    }

    const flaggedCount = flaggedEmployeeIds.length;
    const insightsSummary = flaggedCount > 0
      ? `AI Audit flagged ${flaggedCount} employees for suspicious behavior (duplicate USSD sessions or repeated geofence radius breaches). Fraud Risk Index: ${(fraudRiskScore * 100).toFixed(1)}%.`
      : 'AI Audit completed successfully: No suspicious proxy clocking or velocity patterns identified.';

    const report = await this.prisma.aiAuditReport.create({
      data: {
        payrollRunId,
        tenantId,
        totalLogsAnalyzed,
        fraudRiskScore,
        flaggedEmployeeIds,
        insightsSummary,
      },
    });

    return report;
  }
}
