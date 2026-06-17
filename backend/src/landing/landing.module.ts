import { Module } from '@nestjs/common'
import { LandingController } from './landing.controller'
import { LandingService } from './landing.service'
import { LandingGateway } from './landing.gateway'

@Module({
  controllers: [LandingController],
  providers: [LandingService, LandingGateway],
})
export class LandingModule {}
