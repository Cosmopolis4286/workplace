import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenSessionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
