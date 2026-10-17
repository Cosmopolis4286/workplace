import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class TransferDto {
  @IsUUID()
  recipientUserId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El PIN debe ser de 6 dígitos numéricos' })
  pin: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
