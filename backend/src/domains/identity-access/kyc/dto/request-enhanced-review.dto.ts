import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestEnhancedReviewDto {
  @IsString()
  @MinLength(20, {
    message:
      'Explica por qué necesitas la revisión reforzada (mínimo 20 caracteres)',
  })
  @MaxLength(500)
  reason: string;
}
