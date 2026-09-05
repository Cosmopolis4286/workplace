import { Module } from '@nestjs/common';
import { BusinessReportsController } from './business-reports.controller';
import { BusinessReportsService } from './business-reports.service';
import { OrdersModule } from '../../operations/orders/orders.module';
import { ExpensesModule } from '../../operations/expenses/expenses.module';
import { EmployeesModule } from '../../commerce-core/employees/employees.module';
import { ServicesModule } from '../../commerce-core/services/services.module';
import { CommerceResolverModule } from '../../../common/commerce-resolver/commerce-resolver.module';
import { AccountTypeModule } from '../../../common/account-type/account-type.module';
import { PermissionsModule } from '../../identity-access/permissions/permissions.module';

@Module({
  imports: [
    OrdersModule,
    ExpensesModule,
    EmployeesModule,
    ServicesModule,
    CommerceResolverModule,
    AccountTypeModule,
    PermissionsModule,
  ],
  controllers: [BusinessReportsController],
  providers: [BusinessReportsService],
})
export class BusinessReportsModule {}
