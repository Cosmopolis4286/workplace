import { IsEnum, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ProposalStatus } from '@prisma/client';

export class ReviewFreelancerApplicationDto {
  @IsEnum([ProposalStatus.APPROVED, ProposalStatus.REJECTED], {
    message: 'El estado de revisión debe ser APPROVED o REJECTED',
  })
  status: typeof ProposalStatus.APPROVED | typeof ProposalStatus.REJECTED;

  @ValidateIf((dto) => dto.status === ProposalStatus.REJECTED)
  @IsString({ message: 'Debes indicar el motivo del rechazo' })
  @MaxLength(500)
  rejectionReason?: string;
}
