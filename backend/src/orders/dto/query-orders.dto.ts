import { IsOptional, IsEnum, IsNumberString, IsString, Matches } from 'class-validator';
import { OrderType } from '@prisma/client';

const STATUS_LIST_PATTERN =
  /^(PENDIENTE|CONFIRMADO|PREPARANDO|LISTO|EN_ENTREGA|ENTREGADO|CANCELADO)(,(PENDIENTE|CONFIRMADO|PREPARANDO|LISTO|EN_ENTREGA|ENTREGADO|CANCELADO))*$/;

export class QueryOrdersDto {
  // Acepta un status único ("PENDIENTE") o varios separados por coma
  // ("PENDIENTE,CONFIRMADO,PREPARANDO") para evitar múltiples roundtrips.
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
