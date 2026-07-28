import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { CashMovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsEnum(CashMovementType)
  type: CashMovementType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  reason: string;
}
