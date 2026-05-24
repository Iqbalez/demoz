import { Controller, Post, Body, Res, HttpStatus, Logger, Get, Param } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma.service';
import { TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { tenantStorage } from '../tenant-context';
import { Public } from '../auth/public.decorator';
import * as crypto from 'crypto';

interface CheckoutState {
  tenantId: string;
  phone: string;
  tier: string;
  companyName: string;
}

const checkoutTokenStore = new Map<string, { state: CheckoutState; expiresAt: number }>();

@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Initializes a Chapa subscription payment session for a tenant plan.
   * Supports simulation mode.
   */
  @Public()
  @Post('checkout')
  async createCheckout(
    @Body() body: {
      tier: 'BASIC' | 'GROWTH' | 'ENTERPRISE';
      companyName: string;
      email: string;
      phone: string;
      pin: string;
    },
    @Res() res: any,
  ) {
    const { tier, companyName, email, phone, pin } = body;
    this.logger.log(`Received subscription checkout request for tier ${tier} (${companyName})`);

    // Define price caps and seat volumes
    let amount = 3000;
    let maxEmployees = 10;
    if (tier === 'GROWTH') {
      amount = 5000;
      maxEmployees = 50;
    } else if (tier === 'ENTERPRISE') {
      amount = 10000;
      maxEmployees = 1000;
    }

    // Hash the PIN provided by the user during checkout
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin || '1234', salt);

    // Create a new tenant record in database in PAST_DUE status
    const tenant = await this.prisma.tenant.create({
      data: {
        name: companyName,
        companyCode: `COMP_${Date.now().toString().slice(-6)}`,
        status: TenantStatus.PAST_DUE,
        planTier: tier,
        maxEmployees: maxEmployees,
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Provisional 30 days
      },
    });

    // Generate unique transactional reference with embedded tenant.id
    const txRef = `sub_tx_${tenant.id}_${Date.now()}`;

    // Create a provisional User / Owner for this tenant
    const owner = await this.prisma.user.create({
      data: {
        email: email,
        phoneNumber: phone,
        passwordHash: pinHash, // Store the real hashed PIN
        role: 'OWNER',
        tenantId: tenant.id,
      },
    });

    const checkoutToken = crypto.randomBytes(32).toString('hex');
    checkoutTokenStore.set(checkoutToken, {
      state: {
        tenantId: tenant.id,
        phone,
        tier,
        companyName,
      },
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins validity
    });

    // Handle Chapa API dispatch simulation
    const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST_KEY';

    if (CHAPA_SECRET_KEY === 'CHASECK_TEST_KEY') {
      // In offline demonstration / mock sandbox mode:
      // Return a simulated checkout URL that automatically bypasses and clears payment.
      const simulatedReturnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?signup_success=true&checkout_token=${checkoutToken}`;
      return res.status(HttpStatus.OK).json({
        success: true,
        txRef,
        checkoutUrl: simulatedReturnUrl,
        checkoutToken,
        message: 'Simulation: Click to bypass payment and immediately provision the B2B portal.',
      });
    }

    try {
      const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount.toString(),
          currency: 'ETB',
          email: email,
          first_name: companyName,
          last_name: 'Tenant Owner',
          phone: phone,
          tx_ref: txRef,
          callback_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/subscription/webhook`,
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?signup_success=true&checkout_token=${checkoutToken}`,
        }),
      });

      const data = await response.json();
      if (response.ok && data?.status === 'success') {
        return res.status(HttpStatus.OK).json({
          success: true,
          txRef,
          checkoutUrl: data.data.checkout_url,
          checkoutToken,
        });
      } else {
        throw new Error(data?.message || 'Chapa initialization failed.');
      }
    } catch (err: any) {
      this.logger.error(`Failed to initialize Chapa transaction: ${err.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: err.message || 'Fintech payment initialization failure.',
      });
    }
  }

  /**
   * Resolves the checkout state from a short-lived opaque token securely.
   */
  @Public()
  @Get('checkout/state/:token')
  async getCheckoutState(@Param('token') token: string, @Res() res: any) {
    const record = checkoutTokenStore.get(token);
    if (!record || record.expiresAt < Date.now()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Checkout token is expired or invalid.',
      });
    }
    return res.status(HttpStatus.OK).json({
      success: true,
      ...record.state,
    });
  }

  /**
   * Fetch invoice history and active renewals for the currently logged in tenant.
   */
  @Get('invoices')
  async getInvoices(@Res() res: any) {
    const tenantId = tenantStorage.getStore();
    if (!tenantId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Missing tenant context.' });
    }

    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(HttpStatus.OK).json(invoices);
  }

  /**
   * Chapa webhook payment notification.
   * Transition tenant to ACTIVE status and finalize B2B licensing seats.
   */
  @Public()
  @Post('webhook')
  async verifyPayment(@Body() body: any, @Res() res: any) {
    this.logger.log(`Received payment webhook notification from Chapa gateway`);
    const { tx_ref, status } = body;

    if (status === 'success' && tx_ref) {
      this.logger.log(`Transaction ${tx_ref} successfully cleared! Finalizing database status...`);
      
      try {
        // 1. Initial subscription payment checkout
        if (tx_ref.startsWith('sub_tx_')) {
          const parts = tx_ref.split('_');
          const tenantId = parts[2]; // sub_tx_<tenantId>_<timestamp>
          
          await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
              status: TenantStatus.ACTIVE,
              subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Activate for 30 days
            },
          });
          this.logger.log(`Successfully activated new Tenant ID: ${tenantId}`);
        }
        
        // 2. Renewal invoice subscription payment
        else if (tx_ref.startsWith('sub_renewal_')) {
          const parts = tx_ref.split('_');
          const invoiceId = parts[2]; // sub_renewal_<invoiceId>_<timestamp>
          
          const invoice = await this.prisma.subscriptionInvoice.update({
            where: { id: invoiceId },
            data: { isPaid: true },
            include: { tenant: true },
          });

          // Calculate new expiry date based on current expiry (or from now if already expired)
          const currentExpiry = invoice.tenant.subscriptionExpiresAt;
          const baseDate = currentExpiry && currentExpiry.getTime() > Date.now()
            ? currentExpiry.getTime()
            : Date.now();
            
          await this.prisma.tenant.update({
            where: { id: invoice.tenantId },
            data: {
              status: TenantStatus.ACTIVE,
              subscriptionExpiresAt: new Date(baseDate + 30 * 24 * 60 * 60 * 1000),
            },
          });
          this.logger.log(`Successfully renewed Tenant ID: ${invoice.tenantId} for another 30 days`);
        }
        
        return res.status(HttpStatus.OK).json({ received: true });
      } catch (err: any) {
        this.logger.error(`Error processing payment verify callback: ${err.message}`);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ received: false, error: err.message });
      }
    }

    return res.status(HttpStatus.BAD_REQUEST).json({ received: false });
  }

  /**
   * Developer Endpoint: Simulates monthly subscription expiry.
   * Resets tenant to PAST_DUE status with an expired subscription date,
   * then programmatically triggers the cron invoice generator.
   */
  @Post('simulate-expiry')
  async simulateExpiry(@Res() res: any) {
    let tenantId = tenantStorage.getStore();
    if (!tenantId) {
      tenantId = 'tenant_id_google'; // Default fallback
    }

    // Update tenant to PAST_DUE and set expiry to 1 day ago
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: TenantStatus.PAST_DUE,
        subscriptionExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    // Trigger cron invoice run
    await this.subscriptionService.monitorBillingExpirations();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Subscription expiry simulated successfully. Renewal invoice created.',
      tenant,
    });
  }
}
