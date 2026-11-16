import { IsString, MaxLength } from 'class-validator';
import { NoContactInfo } from '../../../../common/validators/no-contact-info.validator';

export class RespondServiceInquiryDto {
  @IsString()
  @MaxLength(600)
  @NoContactInfo()
  response: string;
}
