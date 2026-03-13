import { Module } from '@nestjs/common'
import { MenuController } from './menu.controller'
import { MenuService } from './menu.service'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { PlansModule } from '../plans/plans.module'

@Module({
  imports: [PrismaModule, NotificationsModule, PlansModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
