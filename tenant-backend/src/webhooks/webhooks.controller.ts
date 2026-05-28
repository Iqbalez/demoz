import { Body, Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { verifyChapaWebhookSignature } from '../lib/chapa/webhook';
import { PrismaService } from '../prisma.service';
import { PayoutStatus, PayrollStatus } from '@prisma/client';
import { PayrollGateway } from '../realtime/payroll.gateway';

@Controller('api/v1/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PayrollGateway,
  ) {}

  /**
   * Chapa transfer webhooks (bulk disbursement status updates).
   * Signature verified via HMAC-SHA256 over raw body.
   */
  @Public()
  @Post('chapa')
  @HttpCode(200)
  async chapa(@Body() body: any, @Headers('x-chapa-signature') signature: string, @Req() req: any) {
    const rawBody: Buffer | undefined = req.rawBody;
    const secret = process.env.CHAPA_WEBHOOK_SECRET || '';
    const ok = rawBody
      ? verifyChapaWebhookSignature({ secret, rawBody, signatureHeader: signature })
      : false;

    if (!ok) {
      this.logger.warn('Rejected Chapa webhook (invalid signature)');
      return { received: true };
    }

    // Chapa docs vary per product; we handle the fields we need safely.
    const reference: string | undefined = body?.reference || body?.data?.reference || body?.tx_ref;
    const status: string | undefined = body?.status || body?.data?.status;

    if (!reference || !status) {
      return { received: true };
    }

    const payoutStatus =
      status === 'success' || status === 'completed' || status === 'SUCCESS'
        ? PayoutStatus.SUCCESS
        : status === 'failed' || status === 'FAILED'
          ? PayoutStatus.FAILED
          : PayoutStatus.PENDING;

    const lineItem = await this.prisma.payrollLineItem.findFirst({
      where: { chapaReference: reference },
      select: { id: true, payrollRunId: true, employeeId: true, payrollRun: { select: { tenantId: true } } },
    });

    if (!lineItem) return { received: true };

    await this.prisma.payrollLineItem.update({
      where: { id: lineItem.id },
      data: {
        payoutStatus,
        disbursed: payoutStatus === PayoutStatus.SUCCESS,
      },
    });

    // If all items are terminal, roll up run status.
    const agg = await this.prisma.payrollLineItem.aggregate({
      where: { payrollRunId: lineItem.payrollRunId },
      _count: { _all: true },
    });

    const remaining = await this.prisma.payrollLineItem.count({
      where: { payrollRunId: lineItem.payrollRunId, payoutStatus: PayoutStatus.PENDING },
    });

    if (remaining === 0 && agg._count._all > 0) {
      const failed = await this.prisma.payrollLineItem.count({
        where: { payrollRunId: lineItem.payrollRunId, payoutStatus: PayoutStatus.FAILED },
      });

      await this.prisma.payrollRun.update({
        where: { id: lineItem.payrollRunId },
        data: { status: failed > 0 ? PayrollStatus.PAYOUT_FAILED : PayrollStatus.PAID },
      });
    }

    const tenantId = lineItem.payrollRun?.tenantId;
    if (tenantId) {
      this.gateway.emitToTenant(tenantId, 'payroll:payout:item', {
        payrollRunId: lineItem.payrollRunId,
        employeeId: lineItem.employeeId,
        chapaReference: reference,
        payoutStatus,
      });
    }

    return { received: true };
  }
}

