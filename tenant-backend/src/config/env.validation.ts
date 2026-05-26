export function validateEnv() {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'UPSTASH_REDIS_URL',
    'CHAPA_SECRET_KEY',
    'CHAPA_WEBHOOK_SECRET',
  ];

  const optionalVars = [
    'NODE_ENV',
    'AFROMESSAGE_API_KEY',
    'AFROMESSAGE_SENDER_NAME',
  ];

  const missingVars: string[] = [];

  for (const v of requiredVars) {
    if (!process.env[v] || process.env[v]?.trim() === '') {
      missingVars.push(v);
    }
  }

  for (const v of optionalVars) {
    if (!process.env[v] || process.env[v]?.trim() === '') {
      console.warn(`⚠️ Warning: Optional environment variable ${v} is missing or empty.`);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      '\n\n❌ Demoz backend failed to start. Missing environment variables:\n' +
      missingVars.map(v => `   • ${v}`).join('\n') +
      '\n\nCheck your .env file and make sure all required variables are set.\n'
    );
  }

  console.log('✅ Environment variables validated successfully');
}
