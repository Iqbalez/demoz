import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
}

/**
 * Custom extractor: tries HttpOnly cookie first, falls back to Bearer header.
 * This lets the web dashboard use secure cookies while the React Native
 * mobile app continues to send the token via the Authorization header.
 */
function cookieThenBearerExtractor(req: Request): string | null {
  // 1. Try HttpOnly cookie (web dashboard)
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  // 2. Fall back to Authorization: Bearer <token> (mobile app)
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: cookieThenBearerExtractor,
      ignoreExpiration: false,
      // Prefer RS256 verification with public key; fallback to HS256 secret for dev.
      secretOrKey: process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET || 'SuperSecretKeyChangeInProduction123!',
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}
