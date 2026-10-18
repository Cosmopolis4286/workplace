import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EscrowDisputeResolution } from '@prisma/client';

export class ResolveDisputeDto {
  @IsEnum(EscrowDisputeResolution)
  resolution: EscrowDisputeResolution;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  releaseAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  refundAmount?: number;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
