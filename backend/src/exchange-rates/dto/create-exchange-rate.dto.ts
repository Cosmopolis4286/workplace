import { IsString, IsNumber, IsBoolean, IsOptional, Min, MaxLength, MinLength } from 'class-validator';

export class CreateExchangeRateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  code: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(20)
  symbol: string;

  @IsNumber()
  @Min(0.000001)
  rateToUsd: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
