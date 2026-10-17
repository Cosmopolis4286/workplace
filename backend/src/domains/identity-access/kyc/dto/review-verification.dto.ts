import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { KycStatus } from '@prisma/client';

export class ReviewVerificationDto {
  @IsEnum([KycStatus.APPROVED, KycStatus.REJECTED], {
    message: 'El estado de revisión debe ser APPROVED o REJECTED',
  })
  status: typeof KycStatus.APPROVED | typeof KycStatus.REJECTED;

  @ValidateIf((dto) => dto.status === KycStatus.REJECTED)
  @IsString({ message: 'Debes indicar el motivo del rechazo' })
  @MaxLength(500)
  rejectionReason?: string;
}
