import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantStatus, UserRole } from '@prisma/client';
import { withoutTenantIsolation } from '../tenant-context';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    return withoutTenantIsolation(async () => {
      const tenants = await this.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            where: { role: UserRole.OWNER },
            select: {
              id: true,
              email: true,
              phoneNumber: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });

      return tenants.map((t) => ({
        id: t.id,
        name: t.name,
        companyCode: t.companyCode,
        subscription_status: t.status,
        planTier: t.planTier,
        maxEmployees: t.maxEmployees,
        created_at: t.createdAt,
        admin_users: t.users,
      }));
    });
  }

  async provisionTenant(data: { companyName: string; adminEmail: string; adminPhone?: string }) {
    const normalizedEmail = data.adminEmail.trim().toLowerCase();

    return withoutTenantIsolation(async () => {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        throw new ConflictException('A user with this email already exists on the platform.');
      }

      let companyCode = '';
      let isUnique = false;
      while (!isUnique) {
        companyCode = Math.floor(1000 + Math.random() * 9000).toString();
        const existingTenant = await this.prisma.tenant.findUnique({ where: { companyCode } });
        if (!existingTenant) isUnique = true;
      }

      let phoneNumber = data.adminPhone?.replace(/\s+/g, '') ?? '';
      if (!phoneNumber) {
        let phoneUnique = false;
        while (!phoneUnique) {
          phoneNumber = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
          const clash = await this.prisma.user.findUnique({ where: { phoneNumber } });
          if (!clash) phoneUnique = true;
        }
      } else {
        const clash = await this.prisma.user.findUnique({ where: { phoneNumber } });
        if (clash) {
          throw new ConflictException('This phone number is already registered.');
        }
      }

      const tempPassword = crypto.randomBytes(18).toString('base64url');
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const result = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: data.companyName.trim(),
            companyCode,
            status: TenantStatus.ACTIVE,
          },
        });

        const admin = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: normalizedEmail,
            passwordHash,
            phoneNumber,
            role: UserRole.OWNER,
            isActive: true,
          },
        });

        return { tenant, admin, tempPassword };
      });

      return {
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          companyCode: result.tenant.companyCode,
          subscription_status: result.tenant.status,
        },
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          role: result.admin.role,
        },
        message:
          'Tenant provisioned. Share login instructions with the client (Google sign-in or set password via support).',
        // Returned once for operator handoff; not stored in plain text elsewhere
        provisionalPassword: result.tempPassword,
      };
    });
  }

  async updateTenantBilling(tenantId: string, status: TenantStatus) {
    return withoutTenantIsolation(async () => {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        throw new NotFoundException('Tenant not found.');
      }

      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status },
      });

      return {
        id: updated.id,
        name: updated.name,
        subscription_status: updated.status,
      };
    });
  }
}
