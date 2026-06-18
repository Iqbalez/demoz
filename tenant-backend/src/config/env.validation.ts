export function validateEnv() {
  const requiredVars = [
    'DATABASE_URL',
    // Prefer RS256 in production (required by blueprint)
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'CHAPA_SECRET_KEY',
    'CHAPA_WEBHOOK_SECRET',
  ];

  const optionalVars = [
    'NODE_ENV',
    'UPSTASH_REDIS_URL',
    'AFROMESSAGE_API_KEY',
    'AFROMESSAGE_SENDER_NAME',
    'SENTRY_DSN',
    'GOOGLE_CLIENT_ID',
    // Backwards-compat/dev fallback (HS256). Not used when RSA keys exist.
    'JWT_SECRET',
  ];

  const missingVars: string[] = [];

  for (const v of requiredVars) {
    if (!process.env[v] || process.env[v]?.trim() === '') {
      missingVars.push(v);
    }
  }

  for (const v of optionalVars) {
    if (!process.env[v] || process.env[v]?.trim() === '') {
      // eslint-disable-next-line no-console
      console.warn(`Warning: Optional environment variable ${v} is missing or empty.`);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      '\n\n❌ Demoz backend failed to start. Missing environment variables:\n' +
      missingVars.map(v => `   • ${v}`).join('\n') +
      '\n\nCheck your .env file and make sure all required variables are set.\n'
    );
  }

  // eslint-disable-next-line no-console
  console.log('Environment variables validated successfully');
}
