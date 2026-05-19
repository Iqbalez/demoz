import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { tenantStorage } from '../tenant-context';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (
      (req.originalUrl && req.originalUrl.includes('/ussd')) ||
      (req.url && req.url.includes('/ussd')) ||
      (req.path && req.path.includes('/ussd'))
    ) {
      return true;
    }

    // 1. Bypass check for @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. Perform passport JWT token validation
    const isValid = await super.canActivate(context);
    if (!isValid) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Token validation failed: Tenant identifier missing.');
    }

    // 3. Dynamically set request-scoped AsyncLocalStorage tenant context
    tenantStorage.enterWith(user.tenantId);

    return true;
  }
}
