import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequireTenant } from '../auth/require-tenant.decorator';
import { UserRole } from '@prisma/client';

@Controller('invites')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireTenant()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  async createInvite(
    @Request() req,
    @Body('email') email: string,
    @Body('role') role: UserRole,
    @Body('customRoleId') customRoleId?: string,
  ) {
    return this.invitationService.createInvite(req.user.tenantId, email, role, customRoleId);
  }

  @Get('team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireTenant()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.HR)
  async getTeam(@Request() req) {
    return this.invitationService.getTeam(req.user.tenantId);
  }

  @Get('validate/:token')
  async validateInvite(@Param('token') token: string) {
    return this.invitationService.validateInvite(token);
  }

  @Post('accept/:token')
  async acceptInvite(
    @Param('token') token: string,
    @Body() body: any,
  ) {
    return this.invitationService.acceptInvite(token, body);
  }
}
