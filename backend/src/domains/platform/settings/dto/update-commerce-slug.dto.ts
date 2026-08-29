import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Regex/longitud compartidos por el slug de tienda (Commerce, /loja/:slug) y
// el slug de perfil profesional (FreelancerSettings, /pro/:slug) — mismo
// patrón de URL pública, dos namespaces @unique distintos en DB.
export const SLUG_REGEX = /^[a-z0-9_.-]+$/;
export const SLUG_REGEX_MESSAGE =
  'El slug solo puede contener letras minúsculas, números, puntos, guiones y guiones bajos';

export class UpdateCommerceSlugDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(SLUG_REGEX, { message: SLUG_REGEX_MESSAGE })
  slug: string;
}

export class UpdateFreelancerSlugDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(SLUG_REGEX, { message: SLUG_REGEX_MESSAGE })
  slug: string;
}
