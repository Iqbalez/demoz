import {
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { UserRole, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import type { Redis } from 'ioredis';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { withoutTenantIsolation } from '../tenant-context';
import { normalizeEthiopianPhone, phoneLookupVariants } from '../lib/phone';

type TokenType = 'access' | 'refresh';

const UNAUTHORIZED_WORKSPACE = {
  errorCode: 'ERR_UNAUTHORIZED_WORKSPACE',
  message:
    'Access Denied. Your workspace is not registered. Contact your HR administrator.',
};

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client | null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClient = clientId ? new OAuth2Client(clientId) : null;
  }

  private getAccessTtlSeconds() {
    return 15 * 60;
  }

  private getRefreshTtlSeconds() {
    return 30 * 24 * 60 * 60;
  }

  private getRefreshBlocklistKey(jti: string) {
    return `auth:refresh:blocklist:${jti}`;
  }

  async generateToken(
    userId: string,
    tenantId: string | null,
    role: UserRole,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, tenantId, role };

    const accessToken = this.jwtService.sign(
      { ...payload, typ: 'access' as TokenType },
      { expiresIn: this.getAccessTtlSeconds() },
    );

    const refreshJti = crypto.randomUUID();
    const refreshToken = this.jwtService.sign(
      { ...payload, typ: 'refresh' as TokenType },
      { expiresIn: this.getRefreshTtlSeconds(), jwtid: refreshJti },
    );

    return { accessToken, refreshToken };
  }

  private async findUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return withoutTenantIsolation(async () => {
      const users = await this.prisma.user.findMany({
        where: { email: normalized, isActive: true },
        include: { tenant: true },
      });

      if (users.length === 0) return null;

      // Same email can exist on a tenant (OWNER) and as platform admin; prefer SUPER_ADMIN.
      const superAdmin = users.find((u) => u.role === UserRole.SUPER_ADMIN);
      return superAdmin ?? users[0];
    });
  }

  private assertUserCanAuthenticate(user: {
    isActive: boolean;
    role: UserRole;
    tenant: { status: TenantStatus } | null;
  }) {
    if (!user.isActive) {
      throw new UnauthorizedException(UNAUTHORIZED_WORKSPACE);
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (!user.tenant) {
      throw new UnauthorizedException(UNAUTHORIZED_WORKSPACE);
    }

    if (user.tenant.status === TenantStatus.SUSPENDED) {
      throw new UnauthorizedException('Your company account is currently suspended.');
    }
  }

  private buildSessionResponse(
    user: {
      id: string;
      email: string;
      phoneNumber: string;
      role: UserRole;
      twoFactorSecret: string | null;
      tenantId: string | null;
      tenant: {
        status: TenantStatus;
        name: string;
        planTier: string | null;
        maxEmployees: number | null;
      } | null;
    },
    tokens: { accessToken: string; refreshToken: string },
  ) {
    return {
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        tenantId: user.tenantId,
        is2FaEnabled: !!user.twoFactorSecret,
        subscription_status: user.tenant?.status ?? null,
        companyName: user.tenant?.name ?? null,
        planTier: user.tenant?.planTier ?? null,
        maxEmployees: user.tenant?.maxEmployees ?? null,
      },
      ...tokens,
    };
  }

  /**
   * Public self-service registration is disabled (invite-only).
   */
  async register() {
    throw new ForbiddenException(
      'Public registration is closed. Contact Demoz to provision your workspace.',
    );
  }

  async login(credentials: { email: string; passwordHash: string }) {
    const user = await this.findUserByEmail(credentials.email);

    if (!user) {
      throw new UnauthorizedException(UNAUTHORIZED_WORKSPACE);
    }

    this.assertUserCanAuthenticate(user);

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Continue with Google.',
      );
    }

    const isMatch = await bcrypt.compare(credentials.passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.generateToken(user.id, user.tenantId, user.role);
    return this.buildSessionResponse(user, tokens);
  }

  async loginWithGoogle(credential: string) {
    if (!this.googleClient || !process.env.GOOGLE_CLIENT_ID) {
      throw new ForbiddenException('Google sign-in is not configured on this server.');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();
    const googleId = payload?.sub;

    if (!email || !googleId) {
      throw new UnauthorizedException('Google account email could not be verified.');
    }

    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException(UNAUTHORIZED_WORKSPACE);
    }

    this.assertUserCanAuthenticate(user);

    if (!user.googleId) {
      await withoutTenantIsolation(() =>
        this.prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        }),
      );
    } else if (user.googleId !== googleId) {
      throw new UnauthorizedException('Google account does not match our records.');
    }

    const tokens = await this.generateToken(user.id, user.tenantId, user.role);
    return this.buildSessionResponse(user, tokens);
  }

  async getMe(userId: string) {
    const user = await withoutTenantIsolation(() =>
      this.prisma.user.findFirst({
        where: { id: userId },
        include: { tenant: true },
      }),
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session invalid.');
    }

    let workspace: {
      employeeCount: number;
      faydaOnFile: number;
      faydaMissing: number;
    } | null = null;

    if (user.tenantId) {
      const employees = await withoutTenantIsolation(() =>
        this.prisma.employee.findMany({
          where: { tenantId: user.tenantId!, status: 'ACTIVE' },
          select: { faydaNumber: true },
        }),
      );
      const faydaOnFile = employees.filter((e) => /^\d{12}$/.test((e.faydaNumber || '').trim())).length;
      workspace = {
        employeeCount: employees.length,
        faydaOnFile,
        faydaMissing: employees.length - faydaOnFile,
      };
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      subscription_status: user.tenant?.status ?? null,
      companyName: user.tenant?.name ?? null,
      planTier: user.tenant?.planTier ?? null,
      maxEmployees: user.tenant?.maxEmployees ?? null,
      workspace,
    };
  }

  async employeeLogin(credentials: { phoneNumber: string; pin: string }) {
    const variants = phoneLookupVariants(credentials.phoneNumber);
    const employee = await withoutTenantIsolation(() =>
      this.prisma.employee.findFirst({
        where: { phoneNumber: { in: variants } },
        include: {
          tenant: true,
          department: { include: { branch: true } },
        },
      }),
    );

    if (!employee || employee.status !== 'ACTIVE') {
      throw new UnauthorizedException('Employee is not active or registered.');
    }

    if (employee.tenant.status === TenantStatus.SUSPENDED) {
      throw new UnauthorizedException('Service suspended for your company.');
    }

    let isPinValid = false;
    if (employee.ussdPinHash) {
      isPinValid = await bcrypt.compare(credentials.pin, employee.ussdPinHash);
    } else if (employee.ussdPin) {
      isPinValid = employee.ussdPin === credentials.pin;
      try {
        const hash = await bcrypt.hash(credentials.pin, 10);
        await withoutTenantIsolation(() =>
          this.prisma.employee.update({
            where: { id: employee.id },
            data: { ussdPinHash: hash },
          }),
        );
      } catch {
        // ignore migration errors
      }
    }

    if (!isPinValid) {
      throw new UnauthorizedException('Invalid security PIN.');
    }

    const tokens = await this.generateToken(employee.id, employee.tenantId, UserRole.EMPLOYEE);

    const normalizedPhone = normalizeEthiopianPhone(employee.phoneNumber);
    if (employee.phoneNumber !== normalizedPhone) {
      await withoutTenantIsolation(() =>
        this.prisma.employee.update({
          where: { id: employee.id },
          data: { phoneNumber: normalizedPhone },
        }),
      );
    }

    return {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        phoneNumber: normalizedPhone,
        employeeIdNumber: employee.employeeIdNumber,
        department: employee.department?.name ?? 'General',
        branchId: employee.department?.branchId ?? null,
      },
      ...tokens,
    };
  }

  async refreshSession(body: { refreshToken: string; phoneNumber?: string }) {
    try {
      const decoded = this.jwtService.verify(body.refreshToken) as {
        typ?: string;
        jti?: string;
        sub: string;
        tenantId: string | null;
        role: UserRole;
      };

      if (decoded?.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      if (decoded.jti) {
        const isBlocked = await this.redis.get(this.getRefreshBlocklistKey(decoded.jti));
        if (isBlocked) {
          throw new UnauthorizedException('Refresh token revoked.');
        }
      }

      const tokens = await this.generateToken(decoded.sub, decoded.tenantId ?? null, decoded.role);
      return {
        accessToken: tokens.accessToken,
        newRefreshToken: tokens.refreshToken,
      };
    } catch {
      if (body.phoneNumber) {
        const variants = phoneLookupVariants(body.phoneNumber);
        const employee = await withoutTenantIsolation(() =>
          this.prisma.employee.findFirst({ where: { phoneNumber: { in: variants } } }),
        );
        if (employee && employee.status === 'ACTIVE') {
          const tokens = await this.generateToken(
            employee.id,
            employee.tenantId,
            UserRole.EMPLOYEE,
          );
          return {
            accessToken: tokens.accessToken,
            newRefreshToken: tokens.refreshToken,
          };
        }
      }
      throw new UnauthorizedException('Session token has expired or is invalid.');
    }
  }

  async revokeRefreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken) as { typ?: string; jti?: string; exp?: number };
      if (decoded?.typ !== 'refresh') return;

      const { jti, exp } = decoded;
      if (!jti || !exp) return;

      const nowSeconds = Math.floor(Date.now() / 1000);
      const ttlSeconds = Math.max(1, exp - nowSeconds);
      await this.redis.set(this.getRefreshBlocklistKey(jti), '1', 'EX', ttlSeconds);
    } catch {
      // ignore invalid tokens on logout
    }
  }

  async generate2Fa(userId: string) {
    const user = await withoutTenantIsolation(() =>
      this.prisma.user.findFirst({ where: { id: userId } }),
    );
    if (!user) throw new UnauthorizedException('User not found.');

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'Demoz SaaS', secret);
    return { secret, otpAuthUrl };
  }

  async activate2Fa(userId: string, token: string, secret: string) {
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) throw new UnauthorizedException('Invalid verification token.');

    await withoutTenantIsolation(() =>
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secret },
      }),
    );

    return { success: true, message: 'Two-Factor Authentication activated successfully.' };
  }
}
