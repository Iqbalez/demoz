import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class InvitationService {
  constructor(private prisma: PrismaService) {}

  async getTeam(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });
    const pendingInvites = await this.prisma.invitation.findMany({
      where: { tenantId, status: 'PENDING' },
      select: { id: true, email: true, role: true, status: true, createdAt: true, expiresAt: true },
    });
    return { users, pendingInvites };
  }

  async createInvite(tenantId: string, email: string, role: UserRole, customRoleId?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user is already a member
    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.tenantId === tenantId) {
      throw new BadRequestException('User is already a member of this workspace.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry

    if (customRoleId) {
      const customRole = await this.prisma.customRole.findFirst({
        where: { id: customRoleId, tenantId },
      });
      if (!customRole) {
        throw new BadRequestException('Custom role not found.');
      }
    }

    const invite = await this.prisma.invitation.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email: normalizedEmail,
        },
      },
      update: {
        token,
        role,
        customRoleId: customRoleId ?? null,
        status: 'PENDING',
        expiresAt,
      },
      create: {
        tenantId,
        email: normalizedEmail,
        token,
        role,
        customRoleId: customRoleId ?? null,
        expiresAt,
      },
    });

    // In a real system, you would send an email here with the invite link containing the token.
    return {
      message: 'Invitation generated successfully.',
      inviteId: invite.id,
      token, // Exposing token just for the sake of the API/testing.
    };
  }

  async validateInvite(token: string) {
    const invite = await this.prisma.invitation.findUnique({
      where: { token },
      include: { tenant: { select: { name: true } } },
    });

    if (!invite || invite.status !== 'PENDING') {
      throw new BadRequestException('Invalid or expired invitation token.');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('This invitation has expired.');
    }

    return {
      email: invite.email,
      role: invite.role,
      companyName: invite.tenant.name,
    };
  }

  async acceptInvite(token: string, body: any) {
    const invite = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invite || invite.status !== 'PENDING' || new Date() > invite.expiresAt) {
      throw new BadRequestException('Invalid or expired invitation token.');
    }

    // Wrap in transaction
    await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findFirst({
        where: { email: invite.email },
      });

      if (!user) {
        if (!body.password || !body.phoneNumber) {
          throw new BadRequestException('Password and phone number are required for new users.');
        }
        const passwordHash = await bcrypt.hash(body.password, 10);
        
        user = await tx.user.create({
          data: {
            email: invite.email,
            passwordHash,
            phoneNumber: body.phoneNumber,
            tenantId: invite.tenantId,
            role: invite.role,
            customRoleId: invite.customRoleId,
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            tenantId: invite.tenantId,
            role: invite.role,
            customRoleId: invite.customRoleId,
          },
        });
      }

      await tx.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });
    });

    return { message: 'Invitation accepted successfully. You can now log in.' };
  }
}
