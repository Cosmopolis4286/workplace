import { IsString } from 'class-validator';

export class VerifyLoginTwoFactorDto {
  @IsString()
  sessionId: string;

  @IsString()
  code: string;
}
