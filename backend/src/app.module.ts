import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { I18nModule, AcceptLanguageResolver, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';
import { SecurityContextMiddleware } from './common/middleware/security-context.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { SpanishThrottlerGuard } from './common/guards/spanish-throttler.guard';
import { AuthModule } from './domains/identity-access/auth/auth.module';
import { UsersModule } from './domains/identity-access/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AccountTypeModule } from './common/account-type/account-type.module';
import { MenuModule } from './domains/commerce-core/menu/menu.module';
import { CustomersModule } from './customers/customers.module';
import { SettingsModule } from './domains/platform/settings/settings.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DeliveryModule } from './delivery/delivery.module';
import { OrdersModule } from './orders/orders.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CashModule } from './cash/cash.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmployeesModule } from './domains/commerce-core/employees/employees.module';
import { BranchesModule } from './domains/commerce-core/branches/branches.module';
import { CatalogModule } from './domains/commerce-core/catalog/catalog.module';
import { PermissionsModule } from './domains/identity-access/permissions/permissions.module';
import { SystemModulesModule } from './domains/platform/system-modules/system-modules.module';
import { ProfilesModule } from './domains/identity-access/profiles/profiles.module';
import { KycModule } from './domains/identity-access/kyc/kyc.module';
import { AuditModule } from './domains/identity-access/audit/audit.module';
import { ServicesModule } from './domains/commerce-core/services/services.module';
import { PlansModule } from './domains/money/plans/plans.module';
import { ExchangeRatesModule } from './domains/money/exchange-rates/exchange-rates.module';
import { HealthModule } from './domains/platform/health/health.module';
import { CategoriesGlobalModule } from './domains/commerce-core/categories-global/categories-global.module';
import { RidesModule } from './rides/rides.module';
import { JobsModule } from './domains/platform/jobs/jobs.module';
import { ProposedCategoriesModule } from './domains/commerce-core/proposed-categories/proposed-categories.module';
import { TelegramModule } from './telegram/telegram.module';
import { WalletsModule } from './domains/money/wallets/wallets.module'
import { PlatformFeesModule } from './domains/money/platform-fees/platform-fees.module';
import { SearchTabsModule } from './domains/commerce-core/search-tabs/search-tabs.module';
import { SearchModule } from './domains/commerce-core/search/search.module';
import { LandingModule } from './domains/platform/landing/landing.module';
import { ReportsModule } from './reports/reports.module';
import { LocationsModule } from './domains/platform/locations/locations.module';
import { BnplModule } from './domains/money/bnpl/bnpl.module';
import { NavigationModule } from './domains/platform/navigation/navigation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    I18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      // service-requests contiene material privado del cliente/proveedor:
      // se sirve solo vía GET /api/services/requests/media/:filename con auth + autorización.
      exclude: ['/service-requests/(.*)'],
    }),
    PrismaModule,
    RedisModule,
    AccountTypeModule,
    UsersModule,
    AuthModule,
    MenuModule,
    CustomersModule,
    SettingsModule,
    AppointmentsModule,
    AnalyticsModule,
    DeliveryModule,
    OrdersModule,
    BnplModule,
    ExpensesModule,
    CashModule,
    ReceiptsModule,
    NotificationsModule,
    EmployeesModule,
    BranchesModule,
    CatalogModule,
    PermissionsModule,
    SystemModulesModule,
    NavigationModule,
    ProfilesModule,
    KycModule,
    AuditModule,
    ServicesModule,
    PlansModule,
    ExchangeRatesModule,
    HealthModule,
    CategoriesGlobalModule,
    RidesModule,
    JobsModule,
    ProposedCategoriesModule,
    TelegramModule,
    WalletsModule,
    PlatformFeesModule,
    SearchTabsModule,
    SearchModule,
    LandingModule,
    ReportsModule,
    LocationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SpanishThrottlerGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityContextMiddleware)
      .forRoutes('*'); // Aplicar a todas las rutas
  }
}
