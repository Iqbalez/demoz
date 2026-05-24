import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private static clients = new Map<string, { count: number; resetTime: number }>();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const limit = this.reflector.get<number>('rateLimit', context.getHandler()) || 60;
    const windowMs = this.reflector.get<number>('rateLimitWindow', context.getHandler()) || 60000;

    const request = context.switchToHttp().getRequest();
    const rawIp = request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;

    const now = Date.now();
    const client = RateLimitGuard.clients.get(ip);

    if (!client) {
      RateLimitGuard.clients.set(ip, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + windowMs;
      return true;
    }

    client.count++;
    if (client.count > limit) {
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests from this IP, please try again later.',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
