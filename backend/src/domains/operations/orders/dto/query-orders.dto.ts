import {
  IsOptional,
  IsEnum,
  IsNumberString,
  IsString,
  Matches,
} from 'class-validator';
import { OrderType } from '@prisma/client';

const STATUS_LIST_PATTERN =
  /^(PENDING|CONFIRMED|PREPARING|READY|OUT_FOR_DELIVERY|DELIVERED|CANCELLED)(,(PENDING|CONFIRMED|PREPARING|READY|OUT_FOR_DELIVERY|DELIVERED|CANCELLED))*$/;

export class QueryOrdersDto {
  // Acepta un status único ("PENDING") o varios separados por coma
  // ("PENDING,CONFIRMED,PREPARING") para evitar múltiples roundtrips.
  @IsOptional()
  @IsString()
  @Matches(STATUS_LIST_PATTERN)
  status?: string;

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
