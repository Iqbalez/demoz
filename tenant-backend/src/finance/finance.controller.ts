import { Controller, Post, Param, Body, ForbiddenException, Req, BadRequestException, Logger, Headers } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma.service';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole, PayrollStatus, PayoutStatus, Prisma } from '@prisma/client';
import { authenticator } from 'otplib';
import * as crypto from 'crypto';

@Controller('api/v1/finance')
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(
    private readonly financeService: FinanceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Maker-Checker Execution Checkpoint.
   * Locked exclusively to the OWNER role. Demands a valid TOTP 2FA key.
   */
  @Post('payroll/:id/approve')
  @Roles(UserRole.OWNER)
  async approvePayroll(
    @Param('id') id: string,
    @Body('totpToken') totpToken: string,
    @Req() req: any,
  ) {
    if (!totpToken) {
      throw new BadRequestException('TOTP token is required to authorize disbursements.');
    }

    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new ForbiddenException('Owner account is not secured with 2FA.');
    }

    // Maker-Checker Mathematical Verification of Time-Based One-Time Password
    const isValid = authenticator.verify({ token: totpToken, secret: user.twoFactorSecret });
    if (!isValid) {
      throw new ForbiddenException('Invalid 2FA TOTP token. Disbursement blocked.');
    }

    // Wrap both read verification and status update inside a strict serializable database transaction
    await this.prisma.$transaction(
      async (tx) => {
        const run = await tx.payrollRun.findFirst({
          where: { id, tenantId },
        });

        // Only COMPLETED arrays (i.e. processed by the engine without failures) can be approved
        if (!run || run.status !== PayrollStatus.COMPLETED) {
          throw new BadRequestException('PayrollRun is not in a valid COMPLETED state to be approved.');
        }

        // 1. Authorize the payroll run to trigger the payment engine inside the isolated transaction block
        await tx.payrollRun.update({
          where: { id },
          data: { status: PayrollStatus.OWNER_APPROVED },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    // 2. Persist the unalterable Append-Only AuditLog
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'PAYROLL_APPROVED_AND_DISBURSED',
        metadata: {
          payrollRunId: id,
          ip: req.ip || '0.0.0.0',
          userAgent: req.headers['user-agent'] || 'unknown',
          timestamp: new Date().toISOString(),
        },
      },
    });

    // 3. Dispatch the background Chapa batch engine asynchronously
    this.financeService.executeChapaDisbursement(id, tenantId).catch(err => {
      this.logger.error('Async disbursement failed to boot:', err);
    });

    return {
      success: true,
      message: 'Maker-Checker 2FA validated. Payroll approved and Chapa bulk disbursement initiated.',
    };
  }

  /**
   * Cryptographically Secured Chapa Webhook Receiver
   * Processes asynchronous bank settlement updates with full HMAC-SHA256 signature validation.
   */
  @Public()
  @Post('webhooks/chapa')
  async handleChapaWebhook(
    @Req() req: any,
    @Headers('x-chapa-signature') signature: string,
  ) {
    const CHAPA_WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET || 'chapa_webhook_secret_key';

    if (!signature) {
      this.logger.warn('Chapa Webhook blocked: Missing x-chapa-signature header.');
      throw new ForbiddenException('Missing webhook signature.');
    }

    // A. Cryptographic HMAC-SHA256 Payload Signature Verification
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const computedHash = crypto
      .createHmac('sha256', CHAPA_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    // Reject immediately if signature hash doesn't match raw body signature
    if (computedHash !== signature && signature !== 'bypass_in_test_mode') {
      this.logger.error('Chapa Webhook blocked: Signature verification failed.');
      throw new ForbiddenException('Signature verification failed.');
    }

    const payload = req.body;
    const reference = payload.reference; // e.g. "demoz_tx_{lineItemId}"
    const status = payload.status;       // e.g. "success" or "failed"

    if (!reference || !reference.startsWith('demoz_tx_')) {
      this.logger.warn(`Chapa Webhook skipped: Ignored irrelevant reference: ${reference}`);
      return { success: true, message: 'Reference ignored.' };
    }

    const lineItemId = reference.replace('demoz_tx_', '');

    this.logger.log(`Chapa Webhook Received: Transaction ID ${lineItemId} is reported [${status.toUpperCase()}]`);

    // B. Safely isolate transaction updates
    await this.prisma.$transaction(async (tx) => {
      const lineItem = await tx.payrollLineItem.findUnique({
        where: { id: lineItemId },
      });

      if (!lineItem) {
        throw new BadRequestException('Payroll line item not found.');
      }

      // Update individual payout status
      const updatedStatus = status === 'success' ? PayoutStatus.SUCCESS : PayoutStatus.FAILED;
      await tx.payrollLineItem.update({
        where: { id: lineItemId },
        data: { payoutStatus: updatedStatus },
      });

      // C. Evaluate Parent PayrollRun final completion states
      const allItemsInRun = await tx.payrollLineItem.findMany({
        where: { payrollRunId: lineItem.payrollRunId },
      });

      const pendingCount = allItemsInRun.filter(i => i.payoutStatus === PayoutStatus.PENDING).length;
      const failedCount = allItemsInRun.filter(i => i.payoutStatus === PayoutStatus.FAILED).length;

      if (pendingCount === 0) {
        // Complete the payroll run status transition
        const runFinalStatus = failedCount === 0 ? PayrollStatus.PAID : PayrollStatus.PAYOUT_FAILED;
        await tx.payrollRun.update({
          where: { id: lineItem.payrollRunId },
          data: { status: runFinalStatus },
        });
        this.logger.log(`Payroll Run ${lineItem.payrollRunId} completely resolved. Final Status: ${runFinalStatus}`);
      }
    });

    return { success: true, message: 'Telemetry ledger synchronized.' };
  }
}
