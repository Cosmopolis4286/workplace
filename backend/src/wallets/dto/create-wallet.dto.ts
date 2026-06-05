import { IsOptional, IsString, Length } from 'class-validator';

export class CreateWalletDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
