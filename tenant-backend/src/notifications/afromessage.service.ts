import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class AfromessageService {
  private readonly logger = new Logger(AfromessageService.name);
  private readonly apiKey = process.env.AFROMESSAGE_API_KEY;
  private readonly senderName = process.env.AFROMESSAGE_SENDER_NAME || 'Demoz';

  async sendSMS(phoneNumber: string, message: string): Promise<SmsSendResult> {
    // Normalise to Ethiopian +251 format
    let normalised = phoneNumber.replace(/\s+/g, '');
    if (!normalised.startsWith('+251')) {
      if (normalised.startsWith('0')) {
        normalised = '+251' + normalised.slice(1);
      } else if (normalised.startsWith('251')) {
        normalised = '+' + normalised;
      } else {
        normalised = '+251' + normalised;
      }
    }

    try {
      const response = await axios.post(
        'https://api.afromessage.com/api/send',
        {
          to: normalised,
          message,
          from: this.senderName,
          type: 'plain',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const data = response.data;
      if (data?.acknowledge === 'request_accepted') {
        return { success: true, messageId: data?.response?.id };
      }
      return { success: false, error: data?.response?.message || 'Unknown Afromessage error' };
    } catch (error: any) {
      console.error('[Afromessage] SMS send failed for', normalised, error?.message || error);
      return { success: false, error: error?.message || 'Request failed' };
    }
  }

  async sendCredentialSMS(phoneNumber: string, email: string, temporaryPassword: string): Promise<void> {
    const message =
      `Welcome to Demoz HR! Your login details:\n` +
      `Email: ${email}\n` +
      `Password: ${temporaryPassword}\n` +
      `Download the app from the Demoz portal.\n` +
      `Change your password after first login.`;

    const result = await this.sendSMS(phoneNumber, message);
    if (!result.success) {
      console.warn('[Onboarding] Failed to send credential SMS to', phoneNumber, '-', result.error);
      // Do not throw — employee is already created
    }
  }

  async sendEmployeeMobileCredentials(phoneNumber: string, name: string, pin: string): Promise<void> {
    const message = `Welcome to Demoz ${name}!\nYour mobile app login PIN is: ${pin}\nPlease do not share this code.`;
    
    // Always log the PIN to the terminal so testing is seamless even if SMS fails/API key is missing
    console.log(`\n================================`);
    console.log(`📱 SMS TO: ${phoneNumber}`);
    console.log(`MESSAGE: ${message}`);
    console.log(`================================\n`);

    const result = await this.sendSMS(phoneNumber, message);
    if (!result.success) {
      console.warn(`[Onboarding] Failed to send mobile credentials SMS to ${phoneNumber} - ${result.error}. (Check API Key).`);
    }
  }

  async sendBulkSMS(
    recipients: Array<{ phone: string; message: string }>,
  ): Promise<{ sent: number; failed: number }> {
    const results = await Promise.allSettled(
      recipients.map((r) => this.sendSMS(r.phone, r.message)),
    );

    let sent = 0;
    let failed = 0;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.success) {
        sent++;
      } else {
        failed++;
      }
    }

    console.log(`[Afromessage] Bulk send: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }
}
