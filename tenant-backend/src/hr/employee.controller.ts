import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
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
  async getAllEmployees(@Query() query: GetEmployeesQueryDto) {
    return this.employeeService.findAll(query);
  }

  @Post()
  @Roles(UserRole.HR, UserRole.OWNER) // Only HR managers or corporate owners can onboard employees
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  /**
   * Triggers an asynchronous, non-blocking Fayda National ID verification.
   * Instantly returns HTTP 202 Accepted with the background tracking jobId.
   */
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
  async updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
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
    const ruri = redirectUri || process.env.FAYDA_REDIRECT_URI || '${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employees';
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
    const ruri = redirectUri || process.env.FAYDA_REDIRECT_URI || '${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employees';

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
    const ruri = redirectUri || process.env.FAYDA_REDIRECT_URI || '${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employees';

    return this.oidcService.exchangeCodeAndGetClaims(code, cid, csec, ruri);
  }
}