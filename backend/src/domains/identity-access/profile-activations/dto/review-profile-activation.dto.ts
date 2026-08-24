import { IsEnum, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ProfileStatus } from '@prisma/client';

export class ReviewProfileActivationDto {
  @IsEnum([ProfileStatus.ACTIVE, ProfileStatus.REJECTED], {
    message: 'El estado de revisión debe ser ACTIVE o REJECTED',
  })
  status: typeof ProfileStatus.ACTIVE | typeof ProfileStatus.REJECTED;

  @ValidateIf((dto) => dto.status === ProfileStatus.REJECTED)
  @IsString({ message: 'Debes indicar el motivo del rechazo' })
  @MaxLength(500)
  rejectionReason?: string;
}
