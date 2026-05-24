import { Controller, Post, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RateLimit } from '../common/guards/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Controller('api/v1/auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint for Owner registration
   */
  @Public()
  @RateLimit(5, 60000)
  @Post('register')
  async register(
    @Body('companyName') companyName: string,
    @Body('ownerEmail') ownerEmail: string,
    @Body('ownerPhone') ownerPhone: string,
    @Body('password') passwordHash: string,
  ) {
    if (!companyName || !ownerEmail || !ownerPhone || !passwordHash) {
      throw new BadRequestException('All registration fields are required.');
    }
    return this.authService.register({
      companyName,
      ownerEmail,
      ownerPhone,
      password: passwordHash,
    });
  }

  /**
   * Endpoint for Owner / HR login
   */
  @Public()
  @RateLimit(5, 60000)
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') passwordHash: string,
  ) {
    if (!email || !passwordHash) {
      throw new BadRequestException('Email and password are required.');
    }
    return this.authService.login({ email, passwordHash });
  }

  /**
   * Endpoint for Employee mobile app login
   */
  @Public()
  @RateLimit(5, 60000)
  @Post('employee-login')
  async employeeLogin(
    @Body('phoneNumber') phoneNumber: string,
    @Body('pin') pin: string,
  ) {
    if (!phoneNumber || !pin) {
      throw new BadRequestException('Phone number and USSD PIN are required.');
    }
    return this.authService.employeeLogin({ phoneNumber, pin });
  }

  /**
   * Endpoint for silent session token refreshes (Axios interceptors)
   */
  @Public()
  @Post('refresh')
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Body('phoneNumber') phoneNumber?: string,
  ) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required.');
    }
    return this.authService.refreshSession({ refreshToken, phoneNumber });
  }

  /**
   * Generates a 2FA TOTP secret key for the owner
   */
  @Post('2fa/generate')
  async generate2Fa(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user session context.');
    }
    return this.authService.generate2Fa(userId);
  }

  /**
   * Validates and activates 2FA TOTP secret key
   */
  @Post('2fa/activate')
  async activate2Fa(
    @Req() req: any,
    @Body('token') token: string,
    @Body('secret') secret: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Invalid user session context.');
    }
    if (!token || !secret) {
      throw new BadRequestException('Token and secret are required for activation.');
    }
    return this.authService.activate2Fa(userId, token, secret);
  }
}
