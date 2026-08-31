import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { RedisModule } from '../../../../redis/redis.module';
import { RoutingModule } from '../routing/routing.module';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    RoutingModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingGateway],
  exports: [TrackingService, TrackingGateway],
})
export class TrackingModule {}
