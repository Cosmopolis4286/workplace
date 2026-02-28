import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
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
import { ExpensesModule } from './expenses/expenses.module'
import { NotificationsModule } from './notifications/notifications.module'
import { EmployeesModule } from './employees/employees.module'
import { BranchesModule } from './branches/branches.module'
import { CatalogModule } from './catalog/catalog.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
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
    ExpensesModule,
    NotificationsModule,
    EmployeesModule,
    BranchesModule,
    CatalogModule,
  ],
})
export class AppModule {}
