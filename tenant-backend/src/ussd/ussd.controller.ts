import { Controller, Post, Body, Headers, Query, UnauthorizedException, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { UssdService } from './ussd.service';

@Controller()
export class UssdController {
  constructor(private readonly ussdService: UssdService) {}

  /**
   * Dedicated telecom gateway callback endpoint at /api/v1/attendance/ussd.
   * Secured using gateway x-api-key verification.
   */
  @Post('api/v1/attendance/ussd')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain')
  async handleUssd(
    @Body() body: { sessionId: string; phoneNumber: string; text: string },
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>,
  ) {
    const telemetryStart = Date.now();
    const gatewayKey = process.env.USSD_GATEWAY_API_KEY || 'DemozSecureApiKey2026';
    const clientKey = headers['x-api-key'] || query['apiKey'];

    if (clientKey !== gatewayKey) {
      throw new UnauthorizedException('Security Verification Failed: Spoofed telecom payload rejected.');
    }

    return this.ussdService.processUssd(body, telemetryStart);
  }

  /**
   * Backwards compatible USSD webhook path.
   */
  @Post('ussd')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain')
  async handleUssdLegacy(
    @Body() body: { sessionId: string; phoneNumber: string; text: string },
  ) {
    const telemetryStart = Date.now();
    return this.ussdService.processUssd(body, telemetryStart);
  }
}
