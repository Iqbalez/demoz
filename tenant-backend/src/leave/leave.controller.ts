import { Controller, Get, Post, Put, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { LeaveService, CreateLeaveRequestDto } from './leave.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('leave')
@UseGuards(RolesGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('types/seed')
  @Roles(UserRole.HR, UserRole.OWNER)
  async seedTypes(@Req() req: any) {
    const tenantId = req['tenantId'];
    return this.leaveService.seedDefaultLeaveTypes(tenantId);
  }

  @Get('types')
  async getTypes(@Req() req: any) {
    const tenantId = req['tenantId'];
    return this.leaveService.getLeaveTypes(tenantId);
  }

  @Post('requests')
  async requestLeave(@Req() req: any, @Body() body: CreateLeaveRequestDto) {
    const tenantId = req['tenantId'];
    return this.leaveService.requestLeave(tenantId, body);
  }

  @Get('requests')
  async getRequests(@Req() req: any, @Query('status') status?: string) {
    const tenantId = req['tenantId'];
    return this.leaveService.getLeaveRequests(tenantId, status);
  }

  @Put('requests/:id/approve')
  @Roles(UserRole.HR, UserRole.OWNER)
  async approveRequest(@Req() req: any, @Param('id') id: string) {
    const tenantId = req['tenantId'];
    const userId = req['user']?.sub;
    return this.leaveService.approveLeave(tenantId, id, userId);
  }

  @Put('requests/:id/reject')
  @Roles(UserRole.HR, UserRole.OWNER)
  async rejectRequest(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    const tenantId = req['tenantId'];
    return this.leaveService.rejectLeave(tenantId, id, reason);
  }
}
