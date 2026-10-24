import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { refreshTokenExtractor } from '../../../../common/utils/jwt-extractor.util';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh'
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: refreshTokenExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub?: unknown; jti?: unknown }) {
    const refreshToken =
      req.body?.refreshToken ?? req.cookies?.['refresh_token'];
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token requerido');

    if (
      typeof payload?.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload?.jti !== 'string' ||
      payload.jti.length < 16 ||
      payload.jti.length > 128
    ) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    return { userId: payload.sub, refreshToken, jti: payload.jti };
  }
}
