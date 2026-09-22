import { IsInt, IsNumber, Min } from 'class-validator';

// Un escalón de precio por volumen total acumulado en la campaña.
export class PriceTierDto {
  @IsInt()
  @Min(1)
  minQuantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
