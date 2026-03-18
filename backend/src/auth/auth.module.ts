import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './strategies/jwt.strategy'
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy'
import { GoogleStrategy } from './strategies/google.strategy'
import { UsersModule } from '../users/users.module'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets configured per-call in service
    UsersModule,
    MailModule,
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, GoogleStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
