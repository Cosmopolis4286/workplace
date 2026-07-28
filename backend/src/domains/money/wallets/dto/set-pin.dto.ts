import { IsString, Length, Matches } from 'class-validator';

export class SetPinDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El PIN debe ser de 6 dígitos numéricos' })
  pin: string;
}

export class ChangePinDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  currentPin: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El nuevo PIN debe ser de 6 dígitos numéricos' })
  newPin: string;
}
