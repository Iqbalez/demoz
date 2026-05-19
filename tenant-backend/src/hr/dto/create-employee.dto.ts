import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  IsDateString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { PaymentMethod, EmployeeStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  employeeIdNumber: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @IsNotEmpty()
  @Matches(/^\d{12}$/, { message: 'faydaNumber must be exactly a 12-digit numeric string' })
  faydaNumber: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  baseSalary: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.BANK;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccount?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus = EmployeeStatus.ACTIVE;

  @IsNotEmpty()
  @IsDateString()
  hireDate: string;
}
