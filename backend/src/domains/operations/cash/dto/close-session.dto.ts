import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseSessionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedAmount: number;

  @IsOptional()
  @IsString()
  closingNotes?: string;
}
