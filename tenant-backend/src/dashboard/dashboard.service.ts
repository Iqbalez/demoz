import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../prisma.service';
import { startOfDay } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  async getTenantKPIs(tenantId: string) {
    const cacheKey = `kpi:${tenantId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('[Redis] cache miss — falling back to DB', err);
    }

    const todayStart = startOfDay(new Date());

    const [headcount, pendingLeave, payrollRun, presentToday] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.payrollRun.findFirst({
        where: { tenantId, status: 'DRAFT' },
        select: { id: true },
      }),
      this.prisma.attendance.count({
        where: { tenantId, checkInTime: { gte: todayStart } },
      }),
    ]);

    const result = {
      headcount,
      pendingLeave,
      payrollDue: !!payrollRun,
      presentToday,
      cachedAt: new Date().toISOString(),
    };

    try {
      await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    } catch (err) {
      console.warn('[Redis] failed to set cache', err);
    }

    return result;
  }

  async invalidateTenantKPICache(tenantId: string) {
    const cacheKey = `kpi:${tenantId}`;
    try {
      await this.redis.del(cacheKey);
    } catch (err) {
      console.warn(`[Redis] failed to invalidate cache for ${cacheKey}`, err);
    }
  }

  async invalidatePayrollCache(tenantId: string) {
    const cacheKey = `payroll:${tenantId}`;
    try {
      await this.redis.del(cacheKey);
    } catch (err) {
      console.warn(`[Redis] failed to invalidate payroll cache for ${cacheKey}`, err);
    }
  }
}
