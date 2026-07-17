import { IsIn, IsOptional, IsString } from 'class-validator';

// Laxo a propósito: no se conoce el contrato real de Cashea/Krece todavía.
// Solo se valida lo mínimo indispensable para localizar la BnplTransaction;
// el resto del payload se guarda tal cual en rawResponse para depuración.
export class BnplWebhookDto {
  @IsString()
  externalReference: string;

  @IsOptional()
  @IsIn(['APROBADA', 'RECHAZADA', 'CANCELADA'])
  status?: 'APROBADA' | 'RECHAZADA' | 'CANCELADA';

  @IsOptional()
  installments?: number;

  [key: string]: unknown;
}
