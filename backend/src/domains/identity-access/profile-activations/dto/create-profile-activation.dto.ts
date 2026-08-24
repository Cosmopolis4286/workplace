import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { ProfessionalSubtype, ProfileType } from '@prisma/client';

export class CreateProfileActivationDto {
  @IsEnum(ProfileType)
  type: ProfileType;

  @ValidateIf((dto) => dto.type === ProfileType.PROFESSIONAL)
  @IsEnum(ProfessionalSubtype, { message: 'subtype es requerido y debe ser FREELANCER o SERVICE_PROVIDER cuando type=PROFESSIONAL' })
  subtype?: ProfessionalSubtype;

  @ValidateIf((dto) => dto.type === ProfileType.PROFESSIONAL || dto.type === ProfileType.BUSINESS)
  @IsUUID(undefined, { message: 'categoryId es requerido para perfiles PROFESSIONAL/BUSINESS' })
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
