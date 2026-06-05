import { IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class TransferDto {
  @IsUUID()
  recipientUserId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
