import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateSellerPaymentAccountDto } from '../../payments/dto/seller-payment-account.dto';

// Destino: una cuenta de cobro guardada (accountId) o una cuenta escrita a
// mano (destination). Se valida con SellerPaymentAccountsService.normalize.
export class CreateWithdrawalDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El PIN debe ser de 6 dígitos numéricos' })
  pin: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSellerPaymentAccountDto)
  destination?: CreateSellerPaymentAccountDto;
}

export class MarkWithdrawalPaidDto {
  @IsString()
  @MaxLength(40)
  payoutReference: string;
}

export class RejectWithdrawalDto {
  @IsString()
  @MaxLength(300)
  reason: string;
}
