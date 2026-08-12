import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectPriceChangeProposalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
