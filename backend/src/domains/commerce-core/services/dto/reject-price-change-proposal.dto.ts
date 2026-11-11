import { IsOptional, IsString, MaxLength } from 'class-validator';
import { NoContactInfo } from '../../../../common/validators/no-contact-info.validator';

export class RejectPriceChangeProposalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @NoContactInfo()
  reason?: string;
}
