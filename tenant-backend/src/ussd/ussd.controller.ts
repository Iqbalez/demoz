import { Controller, Post, Body, Headers, Query, UnauthorizedException, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { UssdService } from './ussd.service';

@Controller()
export class UssdController {
  constructor(private readonly ussdService: UssdService) {}

  // IMPORTANT: This endpoint handles requests from Ethio Telecom's USSD gateway.
  // Registered shortcode: confirm with Ethio Telecom — common prefixes are *384# or *985#
  // Request format: POST with fields: sessionId, serviceCode, phoneNumber, text
  // Response format: CON (continue session) or END (terminate session)
  // Telecom timeout: 90 seconds — sessions MUST be resolved in under 90s
  // Always test with actual Ethio Telecom SIM, not just Postman

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

    try {
      return await this.ussdService.processUssd(body, telemetryStart);
    } catch (error) {
      return 'END አገልግሎቱ ለጊዜው አይገኝም። እባክዎ እንደገና ይደውሉ። / Service temporarily unavailable. Please redial.';
    }
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
    try {
      return await this.ussdService.processUssd(body, telemetryStart);
    } catch (error) {
      return 'END አገልግሎቱ ለጊዜው አይገኝም። እባክዎ እንደገና ይደውሉ። / Service temporarily unavailable. Please redial.';
    }
  }
}
