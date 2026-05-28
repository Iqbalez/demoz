import { Controller, Post, Body, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RateLimit } from '../common/guards/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

/** Shared cookie options for JWT tokens */
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

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
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!companyName || !ownerEmail || !ownerPhone || !passwordHash) {
      throw new BadRequestException('All registration fields are required.');
    }
    const result = await this.authService.register({
      companyName,
      ownerEmail,
      ownerPhone,
      password: passwordHash,
    });

    // Set HttpOnly cookie for web dashboard
    res.cookie('access_token', result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return result;
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
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!email || !passwordHash) {
      throw new BadRequestException('Email and password are required.');
    }
    const result = await this.authService.login({ email, passwordHash });

    // Set HttpOnly cookie for web dashboard
    res.cookie('access_token', result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return result;
  }

  /**
   * Endpoint for Employee mobile app login
   * Note: Mobile app stores the token in-memory / SecureStore, not cookies.
   * The token is still returned in the JSON body for the mobile client.
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
    @Res({ passthrough: true }) res?: Response,
  ) {
    const cookieRefresh = (res as any)?.req?.cookies?.refresh_token as string | undefined;
    const tokenToUse = refreshToken || cookieRefresh;
    if (!tokenToUse) throw new BadRequestException('Refresh token is required.');

    const result = await this.authService.refreshSession({ refreshToken: tokenToUse, phoneNumber });

    // Update HttpOnly cookie with new access token for web dashboard
    if (res && result.accessToken) {
      res.cookie('access_token', result.accessToken, ACCESS_COOKIE_OPTIONS);
    }
    if (res && result.newRefreshToken) {
      res.cookie('refresh_token', result.newRefreshToken, REFRESH_COOKIE_OPTIONS);
    }

    return result;
  }

  /**
   * Logout — clears the HttpOnly cookie
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    const refresh = (res as any)?.req?.cookies?.refresh_token as string | undefined;
    if (refresh) {
      await this.authService.revokeRefreshToken(refresh);
    }
    res.clearCookie('refresh_token', { path: '/' });
    return { success: true, message: 'Session terminated.' };
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
