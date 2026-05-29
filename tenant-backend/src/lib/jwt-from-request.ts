import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export function getTenantIdFromRequest(req: Request): string | null {
  const publicKey = process.env.JWT_PUBLIC_KEY;
  const secret =
    process.env.JWT_SECRET || 'SuperSecretKeyChangeInProduction123!';

  const tryDecode = (token: string): string | null => {
    try {
      const key = publicKey || secret;
      const options: jwt.VerifyOptions = publicKey
        ? { algorithms: ['RS256'] }
        : { algorithms: ['HS256'] };
      const payload = jwt.verify(token, key, options) as { tenantId?: string | null };
      return payload.tenantId ?? null;
    } catch {
      return null;
    }
  };

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const id = tryDecode(authHeader.split(' ')[1]);
    if (id) return id;
  }

  const cookieToken = req.cookies?.access_token as string | undefined;
  if (cookieToken) {
    return tryDecode(cookieToken);
  }

  return null;
}
