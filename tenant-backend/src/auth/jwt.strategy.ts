import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';
import { withoutTenantIsolation } from '../tenant-context';

export interface JwtPayload {
  sub: string;
  iat?: number;
}

function cookieThenBearerExtractor(req: Request): string | null {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: cookieThenBearerExtractor,
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_PUBLIC_KEY ||
        process.env.JWT_SECRET ||
        'SuperSecretKeyChangeInProduction123!',
    });
  }

  /** User sessions + employee mobile sessions (sub = employee.id, role = EMPLOYEE). */
  async validate(payload: JwtPayload) {
    await this.authService.assertSessionValid(payload.sub, payload.iat);

    // 1. Try to find an Admin/Manager User first
    const user = await withoutTenantIsolation(() =>
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      }),
    );

    if (user?.isActive) {
      return {
        userId: user.id,
        // tenantId and role are resolved dynamically by JwtAuthGuard via X-Tenant-ID
        // or by explicitly assigning SUPER_ADMIN.
      };
    }

    // 2. If not found, check if it's an Employee logging in via USSD/PWA
    // Employees are rigidly bound to a single tenant.
    const employee = await withoutTenantIsolation(() =>
      this.prisma.employee.findUnique({
        where: { id: payload.sub },
        select: { id: true, tenantId: true, status: true },
      }),
    );

    if (!employee || employee.status !== 'ACTIVE') {
      throw new UnauthorizedException('Employee session invalid or profile inactive.');
    }

      return {
        userId: employee.id,
        tenantId: employee.tenantId,
        role: UserRole.EMPLOYEE,
      };
    }

    throw new UnauthorizedException('Session invalid or user deactivated.');
  }
}
