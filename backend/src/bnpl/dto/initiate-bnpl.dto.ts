import { IsEnum } from 'class-validator';
import { BnplProvider } from '@prisma/client';

export class InitiateBnplDto {
  @IsEnum(BnplProvider)
  provider: BnplProvider;
}
