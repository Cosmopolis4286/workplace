import { IsNumber, IsString, Min, MaxLength } from 'class-validator';

/** Lo que el proveedor vio en la cotización y acepta explícitamente. */
export class AcceptLeadFeeDto {
  @IsString()
  @MaxLength(40)
  policyVersion: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  leadFee: number;
}
