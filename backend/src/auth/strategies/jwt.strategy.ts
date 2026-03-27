import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
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
    // El token es de corta duración (15 min), no necesita blacklist
    // El logout se maneja revocando el refresh token en la DB
    
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive)
      throw new UnauthorizedException('Usuario inactivo');

    return { ...user, jti: payload.jti };
  }
}
