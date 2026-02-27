import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { MenuModule } from './menu/menu.module'
import { CustomersModule } from './customers/customers.module'
import { SettingsModule } from './settings/settings.module'
import { AppointmentsModule } from './appointments/appointments.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { DeliveryModule } from './delivery/delivery.module'
import { OrdersModule } from './orders/orders.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    MenuModule,
    CustomersModule,
    SettingsModule,
    AppointmentsModule,
    AnalyticsModule,
    DeliveryModule,
    OrdersModule,
  ],
})
export class AppModule {}
