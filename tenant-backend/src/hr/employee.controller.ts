import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ServiceUnavailableException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeeService } from './employee.service';
import { GetEmployeesQueryDto } from './dto/employee-query.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FaydaOidcService } from './fayda-oidc.service';
import { env } from '../config/env';

function canViewHrSensitiveFields(role?: UserRole) {
  return role === UserRole.HR || role === UserRole.OWNER;
}

function formatEmployeeResponse(emp: any, role?: UserRole) {
  if (!emp) return emp;
  const copy = { ...emp };
  delete copy.ussdPin;
  delete copy.ussdPinHash;
  delete copy.pinHash;
  delete copy.nationalId;
  delete copy.salary;
  delete copy.locationCoordinates;
  delete copy.latitude;
  delete copy.longitude;
  delete copy.checkInLatitude;
  delete copy.checkInLongitude;
  delete copy.checkOutLatitude;
  delete copy.checkOutLongitude;

  if (!canViewHrSensitiveFields(role)) {
    delete copy.faydaNumber;
    delete copy.baseSalary;
  } else if (copy.baseSalary != null) {
    copy.baseSalary = Number(copy.baseSalary);
  }

  if (copy.department?.name) {
    copy.departmentName = copy.department.name;
  }
  delete copy.department;

  return copy;
}

@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    @InjectQueue('fayda-queue') private readonly faydaQueue: Queue,
    private readonly oidcService: FaydaOidcService,
  ) {}

  @Get()
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER) // Accessible by all logged in tenant members
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAllEmployees(@Query() query: GetEmployeesQueryDto, @Req() req: { user?: { role?: UserRole } }) {
    const result = await this.employeeService.findAll(query);
    if (result && Array.isArray(result.data)) {
      result.data = result.data.map((emp) => formatEmployeeResponse(emp, req.user?.role));
    }
    return result;
  }

  @Get('org-structure')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER)
  async getOrgStructure() {
    try {
      const employees = await this.employeeService.getOrgStructure();
      return { data: employees };
    } catch (err: any) {
      if (err?.code === 'P2022') {
        throw new ServiceUnavailableException(
          'Org structure is not available — database migration pending. Run: npx prisma db push'
        );
      }
      throw err;
    }
  }

  @Post()
  @Roles(UserRole.HR, UserRole.OWNER) // Only HR managers or corporate owners can onboard employees
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createEmployee(@Body() dto: CreateEmployeeDto, @Req() req: { user?: { role?: UserRole; userId?: string } }) {
    const emp = await this.employeeService.create(dto, req.user?.userId);
    const { mobileAppPin, ...rest } = emp as typeof emp & { mobileAppPin?: string };
    return {
      ...formatEmployeeResponse(rest, req.user?.role),
      mobileAppPin,
    };
  }

  /**
   * Triggers an asynchronous, non-blocking Fayda National ID verification.
   * Instantly returns HTTP 202 Accepted with the background tracking jobId.
   */
  @Post(':id/reset-mobile-pin')
  @Roles(UserRole.HR, UserRole.OWNER)
  async resetMobilePin(@Param('id') id: string) {
    return this.employeeService.resetMobilePin(id);
  }

  @Post('verify-fayda')
  @Roles(UserRole.HR, UserRole.OWNER)
  @HttpCode(HttpStatus.ACCEPTED)
  async verifyFayda(
    @Body('phoneNumber') phoneNumber: string,
    @Body('faydaNumber') faydaNumber: string,
  ) {
    if (!phoneNumber || !faydaNumber) {
      throw new BadRequestException('phoneNumber and faydaNumber are required parameters.');
    }

    const job = await this.faydaQueue.add(
      'verify-fayda-job',
      {
        phoneNumber,
        faydaNumber,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60000, // Initial retry delay of 1 minute (doubles on successive attempts)
        },
      },
    );

    return {
      jobId: job.id,
      status: 'PROCESSING',
    };
  }

  @Patch(':id')
  @Roles(UserRole.HR, UserRole.OWNER) // Only HR managers or corporate owners can modify profiles
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: { user?: { role?: UserRole; userId?: string } },
  ) {
    const emp = await this.employeeService.update(id, dto, req.user?.userId);
    return formatEmployeeResponse(emp, req.user?.role);
  }

  @Post('bulk-upload')
  @Roles(UserRole.HR, UserRole.OWNER) // Only HR managers or corporate owners can perform bulk onboarding
  @UseInterceptors(FileInterceptor('file'))
  async uploadEmployees(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('A spreadsheet/CSV file upload is required.');
    }
    return this.employeeService.bulkUpload(file.buffer);
  }

  /**
   * Generates standard MOSIP eSignet OIDC authorization redirect URL.
   */
  @Get('fayda/auth-url')
  @Roles(UserRole.HR, UserRole.OWNER)
  getFaydaAuthUrl(
    @Query('clientId') clientId?: string,
    @Query('redirectUri') redirectUri?: string,
    @Query('state') state?: string,
  ) {
    const cid = clientId || process.env.FAYDA_CLIENT_ID || 'demoz_client';
    const ruri = redirectUri || process.env.FAYDA_REDIRECT_URI || `${env.FRONTEND_URL}/dashboard/employees`;
    return {
      url: this.oidcService.getAuthUrl(cid, ruri, state),
    };
  }

  /**
   * eSignet OIDC Callback Handler - exchanges authorization code for verified demographic claims.
   */
  @Post('fayda/callback')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.HR, UserRole.OWNER)
  async handleFaydaCallback(
    @Body('code') code: string,
    @Body('clientId') clientId?: string,
    @Body('clientSecret') clientSecret?: string,
    @Body('redirectUri') redirectUri?: string,
  ) {
    if (!code) {
      throw new BadRequestException('OIDC authorization code is required.');
    }
    const cid = clientId || process.env.FAYDA_CLIENT_ID || 'demoz_client';
    const csec = clientSecret || process.env.FAYDA_CLIENT_SECRET || 'demoz_secret';
    const ruri = redirectUri || process.env.FAYDA_REDIRECT_URI || `${env.FRONTEND_URL}/dashboard/employees`;

    return this.oidcService.exchangeCodeAndGetClaims(code, cid, csec, ruri);
  }

  @Get('fayda/callback')
  @Roles(UserRole.HR, UserRole.OWNER)
  async handleFaydaCallbackGet(
    @Query('code') code: string,
    @Query('clientId') clientId?: string,
    @Query('clientSecret') clientSecret?: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    if (!code) {
      throw new BadRequestException('OIDC authorization code is required.');
    }
    const cid = clientId || process.env.FAYDA_CLIENT_ID || 'demoz_client';
    const csec = clientSecret || process.env.FAYDA_CLIENT_SECRET || 'demoz_secret';
    const ruri = redirectUri || process.env.FAYDA_REDIRECT_URI || `${env.FRONTEND_URL}/dashboard/employees`;

    return this.oidcService.exchangeCodeAndGetClaims(code, cid, csec, ruri);
  }
}