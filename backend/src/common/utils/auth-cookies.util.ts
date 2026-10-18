import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { parseDurationToMs } from './duration.util';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

function cookieBaseOptions(config: ConfigService) {
  const isProd = config.get('APP_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/api',
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  config: ConfigService,
  rememberMe = true
): void {
  const base = cookieBaseOptions(config);
  const accessMaxAgeMs = parseDurationToMs(config.get('JWT_EXPIRES_IN', '15m'));

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...base,
    maxAge: accessMaxAgeMs,
  });

  if (rememberMe) {
    const refreshMaxAgeMs = parseDurationToMs(
      config.get('JWT_REFRESH_EXPIRES_IN', '7d')
    );
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...base,
      maxAge: refreshMaxAgeMs,
    });
  } else {
    // "Mantener sesión iniciada" no marcado: cookie de sesión del navegador
    // (sin maxAge) — se borra al cerrar el navegador, aunque el refresh
    // token siga siendo válido en DB por SHORT_REFRESH_EXPIRES_IN.
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, base);
  }
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const base = cookieBaseOptions(config);
  res.clearCookie(ACCESS_TOKEN_COOKIE, base);
  res.clearCookie(REFRESH_TOKEN_COOKIE, base);
}
