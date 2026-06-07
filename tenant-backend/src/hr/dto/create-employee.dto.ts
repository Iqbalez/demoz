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
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departmentName?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tin?: string; // Taxpayer Identification Number — required for ERCA/SIGTAS monthly tax filing

  @IsOptional()
  @IsString()
  @MaxLength(20)
  pensionId?: string; // POESSA Pension ID — required for monthly pension contribution reporting

  @IsOptional()
  @Matches(/^\d{12}$/, { message: 'faydaNumber must be exactly a 12-digit numeric string' })
  faydaNumber?: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  baseSalary: number;

  @IsOptional()
  @IsNumber()
  transportAllowance?: number; // Non-taxable up to 25% of basic salary or 2,200 ETB (whichever lower)

  @IsOptional()
  @IsNumber()
  positionAllowance?: number; // Taxable position/responsibility allowance

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

  @IsOptional()
  @IsDateString()
  hireDate?: string;
}
