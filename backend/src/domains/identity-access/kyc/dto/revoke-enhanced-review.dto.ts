import { IsString, MaxLength, MinLength } from 'class-validator';

export class RevokeEnhancedReviewDto {
  @IsString()
  @MinLength(10, {
    message: 'El motivo de revocación debe tener al menos 10 caracteres',
  })
  @MaxLength(500)
  reason: string;
}
