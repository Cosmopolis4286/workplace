import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  refreshTokenExtractor,
} from '../../../../common/utils/jwt-extractor.util';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh'
) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: refreshTokenExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: { sub?: unknown; jti?: unknown; ver?: unknown }
  ) {
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

    if (payload.ver !== undefined && !Number.isInteger(payload.ver)) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const account = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, authVersion: true },
    });
    if (
      !account?.isActive ||
      (typeof payload.ver === 'number' ? payload.ver : 0) !==
        account.authVersion
    ) {
      throw new UnauthorizedException('Refresh token revocado');
    }

    return { userId: payload.sub, refreshToken, jti: payload.jti };
  }
}
