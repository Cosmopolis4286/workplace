
import { EnhancedReviewStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReviewEnhancedReviewDto {
  @IsEnum([EnhancedReviewStatus.APPROVED, EnhancedReviewStatus.REJECTED], {
    message: 'La decisión debe ser APPROVED o REJECTED',
  })
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @MinLength(10, {
    message: 'El motivo de la decisión debe tener al menos 10 caracteres',
  })
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
