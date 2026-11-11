import { IsString, MaxLength, MinLength } from 'class-validator';
import { NoContactInfo } from '../../../../../common/validators/no-contact-info.validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @NoContactInfo()
  body: string;
}
