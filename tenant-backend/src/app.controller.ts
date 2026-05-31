import { Controller, Get, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from './auth/roles.decorator';
import { Public } from './auth/public.decorator';
import { AuthService } from './auth/auth.service';

@Controller('company-data')
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Get('login-test')
  @Public() // Anyone can call this to generate a valid test JWT
  async getTestToken(
    @Query('userId') userId = 'user_id_123',
    @Query('tenantId') tenantId = 'tenant_id_google',
    @Query('role') role: UserRole = UserRole.EMPLOYEE,
  ) {
    const token = await this.authService.generateToken(userId);
    return { accessToken: token.accessToken };
  }

  @Get('dashboard')
  @Roles(UserRole.EMPLOYEE, UserRole.HR, UserRole.OWNER) // Type-safe roles
  getDashboard() {
    return 'Welcome to the dashboard!';
  }

  @Post('manage-money')
  @Roles(UserRole.OWNER) // Only the OWNER rank can run this action!
  manageVault() {
    return 'Access Granted: You are managing the company finances.';
  }
}