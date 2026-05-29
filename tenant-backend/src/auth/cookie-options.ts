import type { CookieOptions } from 'express';

/** Cross-site cookies required when frontend (Vercel) and API (Render) use different domains. */
export function getAuthCookieOptions(maxAgeMs: number): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;
export const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
