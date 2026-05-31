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
  @Roles('SUPER_ADMIN', 'ORG_ADMIN', 'HR')
  async createInvite(
    @Request() req,
    @Body('email') email: string,
    @Body('role') role: UserRole,
  ) {
    return this.invitationService.createInvite(req.user.tenantId, email, role);
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
