import { Body, Controller, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { InternalService } from './internal.service';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { ProvisionTenantDto, UpdateTenantBillingDto } from './dto/provision-tenant.dto';

@Controller('api/v1/internal')
@UseGuards(SuperAdminGuard)
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('tenants')
  listTenants() {
    return this.internalService.listTenants();
  }

  @Get('stats')
  getStats() {
    return this.internalService.getPlatformStats();
  }

  @Post('tenants')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  provisionTenant(@Body() body: ProvisionTenantDto) {
    return this.internalService.provisionTenant({
      companyName: body.companyName,
      adminEmail: body.adminEmail,
      adminPhone: body.adminPhone,
      planTier: body.planTier,
    });
  }

  @Post('tenants/:id/reset-admin-password')
  resetAdminPassword(@Param('id') id: string) {
    return this.internalService.resetTenantAdminPassword(id);
  }

  @Patch('tenants/:id/billing')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateBilling(@Param('id') id: string, @Body() body: UpdateTenantBillingDto) {
    return this.internalService.updateTenantBilling(id, body.subscription_status);
  }
}
