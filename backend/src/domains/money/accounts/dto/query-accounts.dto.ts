import { IsOptional, IsEnum } from 'class-validator';
import { AccountStatus } from '@prisma/client';

export class QueryAccountsDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
