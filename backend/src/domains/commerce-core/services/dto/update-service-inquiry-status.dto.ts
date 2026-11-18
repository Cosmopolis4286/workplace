import { IsIn } from 'class-validator';

export class UpdateServiceInquiryStatusDto {
  @IsIn(['CANCEL', 'CLOSE'])
  action: 'CANCEL' | 'CLOSE';
}
