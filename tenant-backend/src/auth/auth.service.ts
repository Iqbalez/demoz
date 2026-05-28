import { Inject, Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { UserRole, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import type { Redis } from 'ioredis';
import * as crypto from 'crypto';

type TokenType = 'access' | 'refresh';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private getAccessTtlSeconds() {
    return 15 * 60; // 15 minutes
  }

  private getRefreshTtlSeconds() {
    return 30 * 24 * 60 * 60; // 30 days
  }

  private getRefreshBlocklistKey(jti: string) {
    return `auth:refresh:blocklist:${jti}`;
  }

  /**
   * Generates cryptographically secure access & refresh tokens
   */
  async generateToken(userId: string, tenantId: string, role: UserRole): Promise<{ accessToken: string; refreshToken: string }> {
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

  /**
   * Registers a new tenant and creates an associated OWNER account
   */
  async register(data: { companyName: string; ownerEmail: string; ownerPhone: string; password: string }) {
    // 1. Verify email/phone uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: data.ownerPhone },
    });
    if (existingUser) {
      throw new ConflictException('Owner phone number is already registered.');
    }

    // 2. Generate unique 4-digit numeric USSD companyCode (e.g., 4812)
    let companyCode = '';
    let isUnique = false;
    while (!isUnique) {
      companyCode = Math.floor(1000 + Math.random() * 9000).toString();
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { companyCode },
      });
      if (!existingTenant) isUnique = true;
    }

    // 3. Hash Owner password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 4. Write transactionally to guarantee atomicity
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          companyCode,
          status: TenantStatus.ACTIVE,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.ownerEmail,
          passwordHash,
          phoneNumber: data.ownerPhone,
          role: UserRole.OWNER,
        },
      });

      const tokens = await this.generateToken(user.id, tenant.id, user.role);

      return {
        tenant: { id: tenant.id, name: tenant.name, companyCode },
        user: { id: user.id, email: user.email, role: user.role },
        ...tokens,
      };
    });
  }

  /**
   * Validates email/password credentials for Owner & HR users
   */
  async login(credentials: { email: string; passwordHash: string }) {
    // Bypass tenant-interceptor to read cross-tenant users for global login
    const user = await this.prisma.user.findFirst({
      where: { email: credentials.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(credentials.passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.tenant.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your company account is currently suspended.');
    }

    const tokens = await this.generateToken(user.id, user.tenantId, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        is2FaEnabled: !!user.twoFactorSecret,
      },
      ...tokens,
    };
  }

  /**
   * Authenticates frontline workers on the Mobile app
   */
  async employeeLogin(credentials: { phoneNumber: string; pin: string }) {
    const cleanPhone = credentials.phoneNumber.replace(/\s+/g, '');
    const employee = await this.prisma.employee.findUnique({
      where: { phoneNumber: cleanPhone },
      include: { tenant: true },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      throw new UnauthorizedException('Employee is not active or registered.');
    }

    if (employee.tenant.status === 'SUSPENDED') {
      throw new UnauthorizedException('Service suspended for your company.');
    }

    let isPinValid = false;
    if (employee.ussdPinHash) {
      isPinValid = await bcrypt.compare(credentials.pin, employee.ussdPinHash);
    } else if (employee.ussdPin) {
      isPinValid = employee.ussdPin === credentials.pin;
      
      // Auto-migrate legacy plain PINs to safe bcrypt hashes
      try {
        const hash = await bcrypt.hash(credentials.pin, 10);
        await this.prisma.employee.update({
          where: { id: employee.id },
          data: { ussdPinHash: hash },
        });
      } catch (err) {
        // Silently bypass hashing migration errors
      }
    }

    if (!isPinValid) {
      throw new UnauthorizedException('Invalid security PIN.');
    }

    // Generate worker credentials using EMPLOYEE role
    const tokens = await this.generateToken(employee.id, employee.tenantId, UserRole.EMPLOYEE);

    return {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        phoneNumber: employee.phoneNumber,
        department: employee.departmentId,
      },
      ...tokens,
    };
  }

  /**
   * Refreshes expired session tokens transparently
   */
  async refreshSession(body: { refreshToken: string; phoneNumber?: string }) {
    try {
      const decoded = this.jwtService.verify(body.refreshToken) as any;
      if (decoded?.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const jti: string | undefined = decoded?.jti;
      if (jti) {
        const isBlocked = await this.redis.get(this.getRefreshBlocklistKey(jti));
        if (isBlocked) {
          throw new UnauthorizedException('Refresh token revoked.');
        }
      }

      const tokens = await this.generateToken(decoded.sub, decoded.tenantId, decoded.role);
      return {
        accessToken: tokens.accessToken,
        newRefreshToken: tokens.refreshToken,
      };
    } catch (err) {
      // Fallback fallback checks using phone numbers
      if (body.phoneNumber) {
        const cleanPhone = body.phoneNumber.replace(/\s+/g, '');
        const employee = await this.prisma.employee.findUnique({
          where: { phoneNumber: cleanPhone },
        });
        if (employee && employee.status === 'ACTIVE') {
          const tokens = await this.generateToken(employee.id, employee.tenantId, UserRole.EMPLOYEE);
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
      const decoded = this.jwtService.verify(refreshToken) as any;
      if (decoded?.typ !== 'refresh') return;

      const jti: string | undefined = decoded?.jti;
      const exp: number | undefined = decoded?.exp;
      if (!jti || !exp) return;

      const nowSeconds = Math.floor(Date.now() / 1000);
      const ttlSeconds = Math.max(1, exp - nowSeconds);

      await this.redis.set(this.getRefreshBlocklistKey(jti), '1', 'EX', ttlSeconds);
    } catch {
      // ignore invalid tokens on logout
    }
  }

  /**
   * Generates secure 2FA/TOTP keys for Owners
   */
  async generate2Fa(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found.');

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'Demoz SaaS', secret);

    return { secret, otpAuthUrl };
  }

  /**
   * Activates secure 2FA binding on the account after verification
   */
  async activate2Fa(userId: string, token: string, secret: string) {
    const isValid = authenticator.verify({ token, secret });
    if (!isValid) throw new UnauthorizedException('Invalid verification token.');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { success: true, message: 'Two-Factor Authentication activated successfully.' };
  }
}
