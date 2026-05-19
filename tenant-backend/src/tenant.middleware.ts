import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantStorage } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let tenantId: string | null = null;

    // 1. Check if it's a Dashboard Request (Looks for a Bearer Token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // In a real app, you would decode the JWT here. 
      // For this step, let's assume the token itself contains the tenantId directly.
      tenantId = token; 
    } 

    // 2. Check if it's a USSD Mobile Request (Looks for a companyCode in the text body)
    else if (req.body && req.body.companyCode) {
      const companyCode = req.body.companyCode;
      // Convert the company shortcode into a real tenant ID
      tenantId = `tenant_id_${companyCode.toLowerCase()}`;
    }

    // 3. If we can't find who they belong to, block them (except public USSD requests)
    if (!tenantId) {
      if (req.originalUrl.includes('/ussd') || req.path.includes('/ussd')) {
        return next();
      }
      throw new UnauthorizedException('We do not know which company you belong to!');
    }

    // 4. Put the tenantId into our magical pocket for the rest of this request's lifespan
    tenantStorage.run(tenantId, () => {
      next();
    });
  }
}
