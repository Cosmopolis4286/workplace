import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateCommerceSlugDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_.-]+$/, {
    message:
      'El slug solo puede contener letras minúsculas, números, puntos, guiones y guiones bajos',
  })
  slug: string;
}
