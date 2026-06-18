import 'dotenv/config';
import { env } from './config/env';
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
  const frontendOrigin = env.FRONTEND_URL.replace(/\/$/, '');
  const allowedOrigins = [
    frontendOrigin,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  
  // Enforce secure HTTP headers and strict transport security (HTTPS)
  const helmet = (await import('helmet')).default;
  app.use(helmet());
  app.use(cookieParser()); // Required to parse JWT from HttpOnly cookie
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, res, buf) => { req.rawBody = buf; }
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(env.PORT, '0.0.0.0');
}
bootstrap();
