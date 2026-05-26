import { Controller, Post, Get, Body, Req, Headers, HttpCode, Param, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { ChapaWebhookPayload } from './dto/chapa-webhook.dto';
import { Public } from '../auth/public.decorator';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('chapa/webhook')
  @HttpCode(200)
  async handleChapaWebhook(
    @Body() body: any,
    @Headers('x-chapa-signature') signature: string,
    @Req() req: any,
  ) {
    try {
      const payload = body as ChapaWebhookPayload;
      const rawBody = req.rawBody; // Populated by express.json middleware in main.ts
      
      if (!rawBody) {
        this.logger.warn('rawBody is missing from request. Ensure middleware is correctly configured.');
      }

      await this.paymentsService.handleWebhook(payload, signature || '', rawBody);
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      // We catch the error and still return 200 { received: true }
      // This is because returning non-200 to Chapa causes it to repeatedly retry
      // even for permanent failures like invalid signatures or unsupported events.
    }
    
    return { received: true };
  }

  @Get('transaction/:txRef/status')
  async getTransactionStatus(@Param('txRef') txRef: string) {
    // This route is automatically protected by the global JwtAuthGuard and TenantLifecycleGuard
    // registered in AppModule.
    return this.paymentsService.getTransactionStatus(txRef);
  }
}
