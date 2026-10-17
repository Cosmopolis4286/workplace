import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateDepositRequestDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @MaxLength(60)
  paymentMethod: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
