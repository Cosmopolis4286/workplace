import { GUARDS_METADATA } from '@nestjs/common/constants';
import { MODULE_KEY } from '../../common/decorators/require-module.decorator';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { EmployeesController } from '../../domains/commerce-core/employees/employees.controller';
import { BranchesController } from '../../domains/commerce-core/branches/branches.controller';
import { AppointmentsController } from '../../domains/operations/appointments/appointments.controller';
import { SuppliersController } from '../../domains/operations/suppliers/suppliers.controller';
import { PurchasesController } from '../../domains/operations/purchases/purchases.controller';
import { AccountReceivablesController } from '../../domains/money/accounts/account-receivables.controller';
import { AccountPayablesController } from '../../domains/money/accounts/account-payables.controller';
import { GroupBuyingController } from '../../domains/commerce-core/group-buying/group-buying.controller';

// El plan y el rubro deciden qué módulos tiene cada negocio. Antes solo el
// sidebar lo respetaba: estas APIs aceptaban llamadas de un plan que no
// incluye el módulo (ej. empleados o sucursales en el plan Gratis).
describe('APIs de módulos de negocio validan plan/rubro', () => {
  it.each([
    [EmployeesController, 'employees'],
    [BranchesController, 'branches'],
    [AppointmentsController, 'appointments'],
    [SuppliersController, 'suppliers'],
    [PurchasesController, 'purchases'],
    [AccountReceivablesController, 'accounts'],
    [AccountPayablesController, 'accounts'],
    [GroupBuyingController, 'purchases'],
  ])('%p exige el módulo %s', (controller, module) => {
    expect(Reflect.getMetadata(MODULE_KEY, controller)).toBe(module);
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toContain(
      ModuleAccessGuard
    );
  });
});
