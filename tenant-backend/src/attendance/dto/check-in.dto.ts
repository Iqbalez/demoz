import { IsNumber, IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @IsNumber()
  @IsLongitude()
  longitude: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckOutDto {
  @IsNumber()
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
