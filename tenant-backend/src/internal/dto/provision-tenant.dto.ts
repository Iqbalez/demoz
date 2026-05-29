import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class ProvisionTenantDto {
  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;

  @IsOptional()
  @IsIn(['FREE', 'BASIC', 'GROWTH', 'ENTERPRISE'])
  planTier?: string;
}

export class UpdateTenantBillingDto {
  @IsEnum(TenantStatus)
  subscription_status!: TenantStatus;
}
