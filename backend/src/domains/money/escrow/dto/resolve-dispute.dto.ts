import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EscrowDisputeResolution } from '@prisma/client';

export class ResolveDisputeDto {
  @IsEnum(EscrowDisputeResolution)
  resolution: EscrowDisputeResolution;

  @IsOptional()
  @IsNumber()
  @Min(0)
  releaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
