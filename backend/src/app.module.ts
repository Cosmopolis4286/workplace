import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SecurityContextMiddleware } from './common/middleware/security-context.middleware';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { SpanishThrottlerGuard } from './common/guards/spanish-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MenuModule } from './menu/menu.module';
import { CustomersModule } from './customers/customers.module';
import { SettingsModule } from './settings/settings.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DeliveryModule } from './delivery/delivery.module';
import { OrdersModule } from './orders/orders.module';
import { ExpensesModule } from './expenses/expenses.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmployeesModule } from './employees/employees.module';
import { BranchesModule } from './branches/branches.module';
import { CatalogModule } from './catalog/catalog.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AuditModule } from './audit/audit.module';
import { ServicesModule } from './services/services.module';
import { PlansModule } from './plans/plans.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { HealthModule } from './health/health.module';
import { CategoriesGlobalModule } from './categories-global/categories-global.module';
import { CorridasModule } from './corridas/corridas.module';
import { JobsModule } from './jobs/jobs.module';
import { TelegramModule } from './telegram/telegram.module';
import { WalletsModule } from './wallets/wallets.module'
import { SearchTabsModule } from './search-tabs/search-tabs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
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
    PermissionsModule,
    ProfilesModule,
    AuditModule,
    ServicesModule,
    PlansModule,
    ExchangeRatesModule,
    HealthModule,
    CategoriesGlobalModule,
    CorridasModule,
    JobsModule,
    TelegramModule,
    WalletsModule,
    SearchTabsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SpanishThrottlerGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityContextMiddleware)
      .forRoutes('*'); // Aplicar a todas las rutas
  }
}
