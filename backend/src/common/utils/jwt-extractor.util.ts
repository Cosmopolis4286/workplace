import { ExtractJwt } from 'passport-jwt';
import { Request } from 'express';

/**
 * Extrae el access token: primero del header Authorization (Android/API),
 * y si no existe, de la cookie httpOnly "access_token" (Web SPA).
 */
export function accessTokenExtractor(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;
  return req?.cookies?.['access_token'] ?? null;
}

/**
 * Extrae el refresh token: primero del body (Android, comportamiento
 * actual), y si no existe, de la cookie httpOnly "refresh_token" (Web SPA).
 */
export function refreshTokenExtractor(req: Request): string | null {
  if (req?.body?.refreshToken) return req.body.refreshToken;
  return req?.cookies?.['refresh_token'] ?? null;
}
