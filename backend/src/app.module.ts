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
import { RecaptchaModule } from './common/recaptcha/recaptcha.module';
import { AccountTypeModule } from './common/account-type/account-type.module';
import { CommerceResolverModule } from './common/commerce-resolver/commerce-resolver.module';
import { MenuModule } from './domains/commerce-core/menu/menu.module';
import { CustomersModule } from './domains/operations/customers/customers.module';
import { SettingsModule } from './domains/platform/settings/settings.module';
import { AppointmentsModule } from './domains/operations/appointments/appointments.module';
import { AnalyticsModule } from './domains/engagement/analytics/analytics.module';
import { DeliveryModule } from './domains/operations/delivery/delivery.module';
import { OrdersModule } from './domains/operations/orders/orders.module';
import { ExpensesModule } from './domains/operations/expenses/expenses.module';
import { PurchasesModule } from './domains/operations/purchases/purchases.module';
import { SuppliersModule } from './domains/operations/suppliers/suppliers.module';
import { PricingModule } from './domains/operations/pricing/pricing.module';
import { AccountsModule } from './domains/money/accounts/accounts.module';
import { CashModule } from './domains/operations/cash/cash.module';
import { ReceiptsModule } from './domains/operations/receipts/receipts.module';
import { NotificationsModule } from './domains/engagement/notifications/notifications.module';
import { EmployeesModule } from './domains/commerce-core/employees/employees.module';
import { BranchesModule } from './domains/commerce-core/branches/branches.module';
import { CatalogModule } from './domains/commerce-core/catalog/catalog.module';
import { PermissionsModule } from './domains/identity-access/permissions/permissions.module';
import { SystemModulesModule } from './domains/platform/system-modules/system-modules.module';
import { ProfilesModule } from './domains/identity-access/profiles/profiles.module';
import { KycModule } from './domains/identity-access/kyc/kyc.module';
import { FreelancerApplicationsModule } from './domains/identity-access/freelancer-applications/freelancer-applications.module';
import { ProfileActivationsModule } from './domains/identity-access/profile-activations/profile-activations.module';
import { AuditModule } from './domains/identity-access/audit/audit.module';
import { ServicesModule } from './domains/commerce-core/services/services.module';
import { ServiceRequestMessagesModule } from './domains/commerce-core/services/messages/service-request-messages.module';
import { PlansModule } from './domains/money/plans/plans.module';
import { ExchangeRatesModule } from './domains/money/exchange-rates/exchange-rates.module';
import { HealthModule } from './domains/platform/health/health.module';
import { CategoriesGlobalModule } from './domains/commerce-core/categories-global/categories-global.module';
import { RidesModule } from './domains/operations/rides/rides.module';
import { JobsModule } from './domains/platform/jobs/jobs.module';
import { ProposedCategoriesModule } from './domains/commerce-core/proposed-categories/proposed-categories.module';
import { TelegramModule } from './domains/engagement/telegram/telegram.module';
import { WalletsModule } from './domains/money/wallets/wallets.module'
import { WalletDepositRequestsModule } from './domains/money/wallet-deposit-requests/wallet-deposit-requests.module';
import { PlatformFeesModule } from './domains/money/platform-fees/platform-fees.module';
import { ReputationModule } from './domains/reputation/reputation.module';
import { SearchTabsModule } from './domains/commerce-core/search-tabs/search-tabs.module';
import { SearchModule } from './domains/commerce-core/search/search.module';
import { LandingModule } from './domains/platform/landing/landing.module';
import { ReportsModule } from './domains/engagement/reports/reports.module';
import { LocationsModule } from './domains/platform/locations/locations.module';
import { BnplModule } from './domains/money/bnpl/bnpl.module';
import { NavigationModule } from './domains/platform/navigation/navigation.module';
import { AiOrchestratorModule } from './domains/platform/ai-orchestrator/ai-orchestrator.module';

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
    RecaptchaModule,
    AccountTypeModule,
    CommerceResolverModule,
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
    PurchasesModule,
    SuppliersModule,
    PricingModule,
    AccountsModule,
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
    FreelancerApplicationsModule,
    ProfileActivationsModule,
    AuditModule,
    ServicesModule,
    ServiceRequestMessagesModule,
    PlansModule,
    ExchangeRatesModule,
    HealthModule,
    CategoriesGlobalModule,
    RidesModule,
    JobsModule,
    ProposedCategoriesModule,
    TelegramModule,
    WalletsModule,
    WalletDepositRequestsModule,
    PlatformFeesModule,
    SearchTabsModule,
    SearchModule,
    LandingModule,
    ReportsModule,
    LocationsModule,
    AiOrchestratorModule,
    ReputationModule,
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
