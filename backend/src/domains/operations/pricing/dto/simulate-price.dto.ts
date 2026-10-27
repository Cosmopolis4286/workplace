import { IsOptional, IsNumber } from 'class-validator';

// Simulador de precio (Price Guard, ver WORKPLACE_VISION.md sección 6):
// "¿qué pasa si el tipo de cambio sube 10%?" se expresa acá como un
// incremento porcentual directo sobre el costo de reposición actual, sin
// necesidad de tocar ExchangeRate real ni el historial de compras.
export class SimulatePriceDto {
  @IsOptional()
  @IsNumber()
  costIncreasePct?: number;
}
