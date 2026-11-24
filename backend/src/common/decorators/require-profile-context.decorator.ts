import { SetMetadata } from '@nestjs/common';
import { ProfileType } from '@prisma/client';

/**
 * Limita la autorización heredada por perfil al contexto de negocio indicado.
 * RolePermission y UserPermission siguen siendo transversales; únicamente
 * ProfilePermission se resuelve dentro de estos tipos de perfil.
 */
export const PROFILE_CONTEXT_KEY = 'required_profile_context';
export const RequireProfileContext = (...types: ProfileType[]) =>
  SetMetadata(PROFILE_CONTEXT_KEY, types);
