import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateReceivableDto {
  @IsString()
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsString()
  currencyCode: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // Cliente nuevo de la libreta (sin customerId): se crea con nombre y
  // teléfono para no obligar a ir primero a Clientes.
  @ValidateIf((o) => !o.customerId && o.customerName !== undefined)
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;
}
