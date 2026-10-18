import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TwoFactorService } from './two-factor.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../../engagement/mail/mail.module';
import { SessionCleanupScheduler } from '../../../common/schedulers/session-cleanup.scheduler';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets configured per-call in service
    UsersModule,
    MailModule,
  ],
  providers: [
    AuthService,
    TwoFactorService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    SessionCleanupScheduler,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
