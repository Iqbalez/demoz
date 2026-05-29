import { Controller, Get, Post, Put, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { LeaveService, CreateLeaveRequestDto } from './leave.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('leave')
@UseGuards(RolesGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  private tenantIdFromReq(req: { user?: { tenantId?: string } }) {
    return req.user?.tenantId;
  }

  @Post('types/seed')
  @Roles(UserRole.HR, UserRole.OWNER)
  async seedTypes(@Req() req: any) {
    const tenantId = this.tenantIdFromReq(req);
    return this.leaveService.seedDefaultLeaveTypes(tenantId!);
  }

  @Get('types')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  async getTypes(@Req() req: any) {
    const tenantId = this.tenantIdFromReq(req);
    return this.leaveService.getLeaveTypes(tenantId!);
  }

  @Post('requests')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  async requestLeave(@Req() req: any, @Body() body: CreateLeaveRequestDto) {
    const tenantId = this.tenantIdFromReq(req);
    if (req.user?.role === UserRole.EMPLOYEE) {
      body.employeeId = req.user.userId;
    }
    return this.leaveService.requestLeave(tenantId!, body);
  }

  @Get('requests')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  async getRequests(@Req() req: any, @Query('status') status?: string) {
    const tenantId = this.tenantIdFromReq(req);
    if (req.user?.role === UserRole.EMPLOYEE) {
      return this.leaveService.getLeaveRequestsForEmployee(tenantId!, req.user.userId, status);
    }
    return this.leaveService.getLeaveRequests(tenantId!, status);
  }

  @Put('requests/:id/approve')
  @Roles(UserRole.HR, UserRole.OWNER)
  async approveRequest(@Req() req: any, @Param('id') id: string) {
    const tenantId = this.tenantIdFromReq(req);
    const userId = req.user?.userId;
    return this.leaveService.approveLeave(tenantId!, id, userId);
  }

  @Put('requests/:id/reject')
  @Roles(UserRole.HR, UserRole.OWNER)
  async rejectRequest(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    const tenantId = this.tenantIdFromReq(req);
    return this.leaveService.rejectLeave(tenantId!, id, reason);
  }
}
