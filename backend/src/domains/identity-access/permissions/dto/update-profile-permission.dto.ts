import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ProfileType, ProfessionalSubtype } from '@prisma/client';

export class UpdateProfilePermissionDto {
  @IsEnum(ProfileType)
  profileType: ProfileType;

  @IsOptional()
  @IsEnum(ProfessionalSubtype)
  subtype?: ProfessionalSubtype;

  @IsUUID()
  permissionId: string;

  @IsBoolean()
  granted: boolean;
}
