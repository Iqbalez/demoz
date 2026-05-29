import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as Sentry from '@sentry/node';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  validateEnv();

  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.2,
    });
  }

  const app = await NestFactory.create(AppModule);
  const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
  });
  app.use(cookieParser()); // Required to parse JWT from HttpOnly cookie
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, res, buf) => { req.rawBody = buf; }
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
