import {
  Controller,
  Get,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto/check-in.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * PWA Check-In (Authenticated Employee)
   */
  @Post('check-in')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkIn(@Req() req: any, @Body() dto: CheckInDto) {
    const userId = req.user.userId;
    return this.attendanceService.pwaCheckIn(userId, dto);
  }

  /**
   * PWA Check-Out (Authenticated Employee)
   */
  @Post('check-out')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkOut(@Req() req: any, @Body() dto: CheckOutDto) {
    const userId = req.user.userId;
    return this.attendanceService.pwaCheckOut(userId, dto);
  }

  /**
   * High-Speed Single Clock-in/out Endpoint (Mobile App / Web)
   */
  @Post('web')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async webClockAction(@Req() req: any, @Body() body: any) {
    const employeeId = req.user.userId;
    const tenantId = req.user.tenantId;
    const { type, latitude, longitude } = body;
    return this.attendanceService.verifyWebClockIn(
      employeeId,
      tenantId,
      type,
      latitude,
      longitude,
    );
  }

  /**
   * Offline-First Background Sync Endpoint
   */
  @Post('sync')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  async syncOfflineEvent(@Req() req: any, @Body() body: any) {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    return this.attendanceService.syncOfflineEvent(tenantId, userId, body);
  }

  /**
   * Transactional Batch Synchronization of Offline Local logs
   */
  @Post('batch')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  async batchUpload(
    @Req() req: any,
    @Body('logs') logs: Array<{
      type: 'CLOCK_IN' | 'CLOCK_OUT';
      latitude: number;
      longitude: number;
      timestamp: string;
    }>,
  ) {
    const employeeId = req.user.userId;
    const tenantId = req.user.tenantId;
    if (!logs || !Array.isArray(logs)) {
      throw new BadRequestException('Logs array is required for batch upload.');
    }
    return this.attendanceService.processBatchLogs(employeeId, tenantId, logs);
  }

  /**
   * Fetch Personal Attendance Records (Authenticated Employee)
   */
  @Get('records')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  async getRecords(@Req() req: any) {
    const userId = req.user.userId;
    return this.attendanceService.getRecords(userId);
  }

  /**
   * USSD Webhook Parser (Public Callback from Gateways like Africa's Talking)
   */
  @Public()
  @Post('ussd')
  @HttpCode(HttpStatus.OK)
  async handleUssd(
    @Body() body: { phoneNumber: string; text: string; sessionId?: string; serviceCode?: string },
  ) {
    return this.attendanceService.processUssdWebhook(body);
  }
}
