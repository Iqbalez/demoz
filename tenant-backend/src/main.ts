import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as Sentry from '@sentry/node';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  validateEnv();

  Sentry.init({
    dsn: process.env.SENTRY_DSN || 'https://48afc8b1ab221d2b6814f20222996250@o4511447095181312.ingest.us.sentry.io/4511447097606144',
    tracesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_URL || '*' }); // Enable CORS dynamically
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, res, buf) => { req.rawBody = buf; }
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
