import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { AttendanceSource, AttendanceType } from '@prisma/client';
import { USSD_MESSAGES, formatMessage } from './ussd.messages';
import { env } from '../config/env';

type UssdSessionState = 
  | 'WELCOME'
  | 'AWAITING_PIN'
  | 'AUTHENTICATED'
  | 'CLOCK_ACTION_CONFIRM'
  | 'COMPLETE';

interface UssdSession {
  state: UssdSessionState;
  employeeId?: string;
  phoneNumber: string;
  startedAt: string;
  lastAction?: 'CLOCK_IN' | 'CLOCK_OUT';
}

@Injectable()
export class UssdService implements OnModuleInit {
  private readonly logger = new Logger(UssdService.name);
  private redisClient: any = null;

  constructor(private readonly prisma: PrismaService) {
    this.initRedis();
  }

  async onModuleInit() {
    if (!this.redisClient) {
      throw new Error('[FATAL] USSD service cannot connect to Redis. USSD sessions require Redis — refusing to start.');
    }
    try {
      await this.redisClient.ping();
    } catch (err) {
      throw new Error(
        '[FATAL] USSD service cannot connect to Redis. USSD sessions require Redis — refusing to start.'
      );
    }
  }

  private async initRedis() {
    try {
      const Redis = require('ioredis');
      const upstashUrl = process.env.UPSTASH_REDIS_URL;

      this.redisClient = upstashUrl
        ? new Redis(upstashUrl)
        : new Redis({
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            password: env.REDIS_PASSWORD || undefined,
            tls:
              process.env.REDIS_TLS === 'true' ||
              process.env.REDIS_HOST?.includes('upstash.io')
                ? {}
                : undefined,
            maxRetriesPerRequest: 3,
            connectTimeout: 2000,
          });

      this.redisClient.on('connect', () => {
        this.logger.log('USSD pre-authentication Redis cache connected.');
      });

      this.redisClient.on('error', (err: any) => {
        this.logger.error(`Redis connection error: ${err.message}`);
      });
    } catch (e) {
      this.logger.error('ioredis package not found. USSD service will fail.');
    }
  }

  async setSession(sessionId: string, session: UssdSession): Promise<void> {
    await this.redisClient.setex(`ussd:session:${sessionId}`, 90, JSON.stringify(session));
  }

  async getSession(sessionId: string): Promise<UssdSession | null> {
    const raw = await this.redisClient.get(`ussd:session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  }

  private async getCache(key: string): Promise<any> {
    const val = await this.redisClient.get(key);
    return val ? JSON.parse(val) : null;
  }

  private async setCache(key: string, value: any): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', 3600);
  }

  private getEthiopianTimeStr(): string {
    const utcDate = new Date();
    const etOffset = 3 * 60 * 60 * 1000;
    const etDate = new Date(utcDate.getTime() + etOffset);
    return `${etDate.getUTCHours().toString().padStart(2, '0')}:${etDate.getUTCMinutes().toString().padStart(2, '0')}`;
  }

  async checkDuplicateClockIn(employeeId: string): Promise<boolean> {
    const recentKey = `ussd:clockin:${employeeId}`;
    const recent = await this.redisClient.get(recentKey);
    if (recent) return true;
    
    await this.redisClient.setex(recentKey, 300, '1');
    return false;
  }

  async processUssd(
    body: { sessionId: string; phoneNumber: string; text: string },
    telemetryStart: number,
  ): Promise<string> {
    const { sessionId, phoneNumber, text } = body;
    const cleanPhone = phoneNumber ? phoneNumber.trim() : '';

    const cacheKey = `demoz:ussd:employee:${cleanPhone}`;
    let employee = await this.getCache(cacheKey);

    if (!employee) {
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
          ussdPinHash: dbEmployee.ussdPinHash,
          tenantId: dbEmployee.tenantId,
          tenantStatus: dbEmployee.tenant.status,
        };
        await this.setCache(cacheKey, employee);
      }
    }

    if (!employee || employee.status !== 'ACTIVE') {
      return USSD_MESSAGES.unregistered;
    }
    if (employee.tenantStatus === 'SUSPENDED') {
      return USSD_MESSAGES.suspended;
    }

    // Some gateways send cumulative strings (1*1234), others send incremental.
    // To handle cumulative properly without breaking session state:
    const parts = text ? text.split('*').map(p => p.trim()).filter(Boolean) : [];
    const currentInput = parts.length > 0 ? parts[parts.length - 1] : '';

    let session = await this.getSession(sessionId);

    if (!session) {
      // Check for replay
      const recentSessionRaw = await this.redisClient.get(`ussd:recent:${cleanPhone}`);
      if (recentSessionRaw && text !== '') {
        const parsed = JSON.parse(recentSessionRaw);
        if (parsed.state === 'AWAITING_PIN' || parsed.state === 'CLOCK_ACTION_CONFIRM') {
          session = parsed;
        }
      }
    }

    // Initial Dial
    if (!session || (!text && parts.length === 0)) {
      session = {
        state: 'WELCOME',
        phoneNumber: cleanPhone,
        employeeId: employee.id,
        startedAt: new Date().toISOString(),
      };
      await this.setSession(sessionId, session);
      return formatMessage(USSD_MESSAGES.clockInPrompt, { name: employee.firstName });
    }

    // State routing
    if (session.state === 'WELCOME') {
      if (currentInput === '1' || currentInput === '2') {
        session.state = 'AWAITING_PIN';
        session.lastAction = currentInput === '1' ? 'CLOCK_IN' : 'CLOCK_OUT';
        await this.setSession(sessionId, session);
        await this.redisClient.setex(`ussd:recent:${cleanPhone}`, 300, JSON.stringify(session));
        return USSD_MESSAGES.welcome; // Await PIN
      } else if (currentInput === '0') {
        return USSD_MESSAGES.cancelled;
      }
      return USSD_MESSAGES.invalidOption;
    }

    if (session.state === 'AWAITING_PIN' || session.state === 'CLOCK_ACTION_CONFIRM') {
      const pin = currentInput;
      const isPinValid = employee.ussdPinHash ? await bcrypt.compare(pin, employee.ussdPinHash) : false;
      
      if (!isPinValid) {
        return USSD_MESSAGES.invalidPin;
      }

      if (session.lastAction === 'CLOCK_IN') {
        const isDuplicate = await this.checkDuplicateClockIn(employee.id);
        if (isDuplicate) {
          return USSD_MESSAGES.duplicateRecord;
        }
      }

      const attendanceType = session.lastAction === 'CLOCK_IN' ? AttendanceType.CLOCK_IN : AttendanceType.CLOCK_OUT;
      
      const telemetryPayload = {
        sessionId,
        requestDurationMs: Date.now() - telemetryStart,
        cleanPhone,
        inputHistory: text,
        timestamp: new Date().toISOString(),
      };

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

      session.state = 'COMPLETE';
      await this.setSession(sessionId, session);
      
      const time = this.getEthiopianTimeStr();
      return session.lastAction === 'CLOCK_IN' 
        ? formatMessage(USSD_MESSAGES.clockInSuccess, { time })
        : formatMessage(USSD_MESSAGES.clockOutSuccess, { time });
    }

    return USSD_MESSAGES.sessionExpired;
  }
}
