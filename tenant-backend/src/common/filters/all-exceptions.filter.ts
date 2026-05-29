import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Detect if the target route is a telecom USSD callback
    const isUssd = request.originalUrl.includes('/ussd') || request.path.includes('/ussd');

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected system error occurred.';
    let errorCode: string | undefined;

    // 1. Intercept NestJS HttpExceptions (validation errors, route guards, manual checks)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resExpr = exception.getResponse();
      if (typeof resExpr === 'object' && resExpr !== null) {
        const body = resExpr as { message?: string | string[]; errorCode?: string };
        if (body.errorCode) errorCode = body.errorCode;
        const rawMsg = body.message;
        message = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg || exception.message;
      } else {
        message = exception.message;
      }
    }
    // 2. Intercept Prisma Database Specific Exceptions
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.BAD_REQUEST;
        message = 'A duplicate database record constraint was violated.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'The requested database record was not found.';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = process.env.NODE_ENV === 'production'
          ? `Database constraint error (${exception.code}) occurred.`
          : `Database constraint error (${exception.code}): ${exception.message}`;
      }
    }
    // 3. General native Javascript Runtime Errors
    else if (exception instanceof Error) {
      message = process.env.NODE_ENV === 'production'
        ? 'An unexpected system error occurred. Please contact support.'
        : exception.message;
    }

    this.logger.error(
      `Exception intercepted on [${request.method}] ${request.url}:`,
      exception.stack || exception,
    );

    if (status >= 500) {
      Sentry.captureException(exception);
    }

    // 4. USSD Gateway Response: return plain text "END System error: ..." with 200 OK
    if (isUssd) {
      response.setHeader('Content-Type', 'text/plain');
      response.status(HttpStatus.OK).send(`END System error: ${message}`);
      return;
    }

    // 5. Client JSON API Response: return clean standardized structure
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errorCode ? { errorCode } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
