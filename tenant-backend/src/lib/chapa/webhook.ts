import { createHmac, timingSafeEqual } from 'crypto';

export function verifyChapaWebhookSignature(params: {
  secret: string;
  rawBody: Buffer;
  signatureHeader: string | undefined;
}): boolean {
  const { secret, rawBody, signatureHeader } = params;
  if (!secret || !signatureHeader || !rawBody) return false;

  const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');

  const a = Buffer.from(signatureHeader, 'utf8');
  const b = Buffer.from(expectedHex, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

