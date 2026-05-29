import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { withoutTenantIsolation } from '../tenant-context';

export interface JwtPayload {
  sub: string;
  tenantId: string | null;
  role: UserRole;
}

function cookieThenBearerExtractor(req: Request): string | null {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
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
    const user = await withoutTenantIsolation(() =>
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, tenantId: true, role: true, isActive: true },
      }),
    );

    if (user?.isActive) {
      return {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
      };
    }

    if (payload.role === UserRole.EMPLOYEE) {
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
