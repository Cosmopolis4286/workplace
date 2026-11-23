import { IsEnum, IsOptional } from 'class-validator';
import { ProfileType, ProfessionalSubtype } from '@prisma/client';

export class ProfileImpactQueryDto {
  @IsEnum(ProfileType)
  profileType: ProfileType;

  @IsOptional()
  @IsEnum(ProfessionalSubtype)
  subtype?: ProfessionalSubtype;
}
