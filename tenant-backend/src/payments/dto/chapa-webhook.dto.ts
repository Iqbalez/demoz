export interface ChapaWebhookPayload {
  event: string;
  tx_ref: string;
  amount: string;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  status: 'success' | 'failed';
  reference: string;
  created_at: string;
}
