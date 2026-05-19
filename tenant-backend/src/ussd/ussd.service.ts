import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { AttendanceSource, AttendanceType } from '@prisma/client';

@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);
  private redisClient: any = null;
  private memoryCache = new Map<string, { value: any; expires: number }>();

  constructor(private readonly prisma: PrismaService) {
    this.initRedis();
  }

  /**
   * Initializes high-speed cache connection with automatic fault-tolerant failover
   */
  private async initRedis() {
    try {
      // Dynamic import to prevent startup failures if ioredis isn't installed
      const Redis = require('ioredis');
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);

      this.redisClient = new Redis({
        host,
        port,
        maxRetriesPerRequest: 3,
        connectTimeout: 2000,
      });

      this.redisClient.on('connect', () => {
        this.logger.log('USSD pre-authentication Redis cache connected.');
      });

      this.redisClient.on('error', (err: any) => {
        this.logger.warn(`Redis connection failed. Falling back to local high-speed memory cache: ${err.message}`);
        this.redisClient = null;
      });
    } catch (e) {
      this.logger.warn('ioredis package not found. Enforcing standalone local memory cache.');
    }
  }

  /**
   * Reads from Cache Layer with local Map fallback
   */
  private async getCache(key: string): Promise<any> {
    if (this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        // Fallback silently to memory
      }
    }

    const local = this.memoryCache.get(key);
    if (local && local.expires > Date.now()) {
      return local.value;
    }
    return null;
  }

  /**
   * Writes to Cache Layer with 1-hour TTL (3600 seconds)
   */
  private async setCache(key: string, value: any): Promise<void> {
    const stringified = JSON.stringify(value);
    if (this.redisClient) {
      try {
        await this.redisClient.set(key, stringified, 'EX', 3600);
        return;
      } catch (err) {
        // Fallback silently to memory
      }
    }

    this.memoryCache.set(key, {
      value,
      expires: Date.now() + 3600 * 1000,
    });
  }

  /**
   * Calibrates current time to East Africa Time (UTC+3) formatted as HH:MM
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
   * Processes stateless telecom webhook sessions.
   * Leverages Redis cache to complete checks within 150ms.
   */
  async processUssd(
    body: { sessionId: string; phoneNumber: string; text: string },
    telemetryStart: number,
  ): Promise<string> {
    const { sessionId, phoneNumber, text } = body;
    const cleanPhone = phoneNumber ? phoneNumber.trim() : '';

    // Parse accumulated USSD input segments
    const parts = text ? text.split('*').map(p => p.trim()) : [];

    // Step A. High-speed cache pre-auth lookup
    const cacheKey = `demoz:ussd:employee:${cleanPhone}`;
    let employee = await this.getCache(cacheKey);

    if (!employee) {
      this.logger.log(`Cache miss: Fetching employee profile for ${cleanPhone} from PostgreSQL.`);
      
      const dbEmployee = await this.prisma.employee.findUnique({
        where: { phoneNumber: cleanPhone },
        include: { tenant: { select: { status: true } } },
      });

      if (dbEmployee) {
        employee = {
          id: dbEmployee.id,
          firstName: dbEmployee.firstName,
          lastName: dbEmployee.lastName,
          status: dbEmployee.status,
          ussdPin: dbEmployee.ussdPin,
          ussdPinHash: dbEmployee.ussdPinHash,
          tenantId: dbEmployee.tenantId,
          tenantStatus: dbEmployee.tenant.status,
        };
        await this.setCache(cacheKey, employee);
      }
    }

    // Step 0: Initial Dial (no actions chosen yet)
    if (parts.length === 0 || parts[0] === '') {
      if (!employee || employee.status !== 'ACTIVE') {
        return 'END Your phone number is not registered on Demoz. Please contact HR.';
      }

      if (employee.tenantStatus === 'SUSPENDED') {
        return 'END System error: Service suspended for this business.';
      }

      return `CON Welcome ${employee.firstName} to Demoz.\n1. Clock In\n2. Clock Out`;
    }

    const action = parts[0];
    if (action !== '1' && action !== '2') {
      return 'END Invalid option selected. Dial again.';
    }

    // Step 1: Option selected, prompt for secure PIN
    if (parts.length === 1) {
      return 'CON Enter your 4-digit PIN to confirm your log:';
    }

    // Step 2: PIN verification step (concatenated as "1*PIN" or "2*PIN")
    if (parts.length === 2) {
      const pin = parts[1];

      if (!employee || employee.status !== 'ACTIVE') {
        return 'END Your phone number is not registered on Demoz. Please contact HR.';
      }

      if (employee.tenantStatus === 'SUSPENDED') {
        return 'END System error: Service suspended for this business.';
      }

      // Authorize worker using self-healing ussdPinHash bcrypt validation
      let isPinValid = false;
      if (employee.ussdPinHash) {
        isPinValid = await bcrypt.compare(pin, employee.ussdPinHash);
      } else if (employee.ussdPin) {
        // Plain text fallback upgrade path
        if (employee.ussdPin === pin) {
          isPinValid = true;
          
          // Secure plain PIN asynchronously
          try {
            const hash = await bcrypt.hash(pin, 10);
            await this.prisma.employee.update({
              where: { id: employee.id },
              data: { ussdPinHash: hash },
            });
            // Update cache to use hash
            employee.ussdPinHash = hash;
            await this.setCache(cacheKey, employee);
            this.logger.log(`Legacy PIN secured to hash for employee ${employee.id}`);
          } catch (err) {
            this.logger.error(`Failed to secure plain PIN:`, err);
          }
        }
      }

      if (!isPinValid) {
        return 'END Authentication failed. Invalid PIN.';
      }

      const attendanceType = action === '1' ? AttendanceType.CLOCK_IN : AttendanceType.CLOCK_OUT;
      const requestDurationMs = Date.now() - telemetryStart;

      // Log behavioral metadata into JSONB telemetry field to detect proxy clocking fraud
      const telemetryPayload = {
        sessionId,
        requestDurationMs,
        cleanPhone,
        inputHistory: text,
        sessionPace: parts.length,
        timestamp: new Date().toISOString(),
      };

      // Dispatch attendance logging asynchronously to avoid blocking the USSD shortcode thread
      this.prisma.attendanceLog.create({
        data: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          type: attendanceType,
          source: AttendanceSource.USSD,
          isAnomaly: false,
          telemetry: telemetryPayload,
        },
      }).catch(err => {
        this.logger.error(`Async USSD log write failed: ${err.message}`);
      });

      const currentTime = this.getEthiopianTimeStr();
      return `END Thank you. Your attendance has been logged successfully at ${currentTime}.`;
    }

    return 'END Invalid USSD state. Session terminated.';
  }
}
