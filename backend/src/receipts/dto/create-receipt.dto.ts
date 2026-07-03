import { IsString } from 'class-validator';

export class CreateReceiptDto {
  @IsString()
  orderId: string;
}
