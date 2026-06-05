import { IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
