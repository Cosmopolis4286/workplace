import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private redis: RedisService,
    private usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    payload: { sub: string; email: string; jti: string }
  ) {
    // Check if token is blacklisted (after logout)
    if (payload.jti) {
      const blacklisted = await this.redis.isTokenBlacklisted(payload.jti);
      if (blacklisted) throw new UnauthorizedException('Token inválido');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive)
      throw new UnauthorizedException('Usuario inactivo');

    return { ...user, jti: payload.jti };
  }
}
