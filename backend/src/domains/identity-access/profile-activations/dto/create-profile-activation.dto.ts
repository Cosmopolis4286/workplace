import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { BillingInterval, ProfessionalSubtype, ProfileType } from '@prisma/client';

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

  // Solo aplica (y es requerido) para type=BUSINESS — nombre del comercio a
  // crear cuando se apruebe la solicitud. Sin esto, ProfileActivationsService
  // no tenía forma de crear el Commerce en review(), a diferencia de
  // UsersService.create() (que sí recibe commerceName).
  @ValidateIf((dto) => dto.type === ProfileType.BUSINESS)
  @IsString({ message: 'commerceName es requerido para perfiles BUSINESS' })
  @IsNotEmpty({ message: 'commerceName es requerido para perfiles BUSINESS' })
  @MaxLength(120)
  commerceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  // Plan elegido por el solicitante — solo aplica a PROFESSIONAL/BUSINESS.
  // Se guarda en UserProfile.pendingPlanId y se activa como Subscription al
  // aprobar (ver ProfileActivationsService.review()). Único punto de entrada
  // para "quiero ser Profesional/Negocio" — reemplaza POST /plans/upgrade.
  @ValidateIf((dto) => !!dto.planId)
  @IsUUID(undefined, { message: 'planId debe ser un UUID válido' })
  planId?: string;

  @IsOptional()
  @IsEnum(BillingInterval)
  planInterval?: BillingInterval;
}
