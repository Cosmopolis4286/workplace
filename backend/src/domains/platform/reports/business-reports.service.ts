import { Inject, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrdersService } from '../../operations/orders/orders.service';
import { ExpensesService } from '../../operations/expenses/expenses.service';
import { EmployeesService } from '../../commerce-core/employees/employees.service';
import { ServicesService } from '../../commerce-core/services/services.service';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';
import { PermissionsFacade, PERMISSIONS_FACADE } from '../../identity-access/permissions/permissions.facade';

/**
 * Agregador de "Reportes del Negocio" — antes la página /reports del
 * frontend orquestaba 3 fetches separados (orders/expenses/employees stats)
 * sin que ningún endpoint propio exigiera reports:view (era un permiso
 * "fantasma" que solo gateaba el ruteo del frontend, no los datos reales).
 * Este servicio hace la misma orquestación server-side, protegida por un
 * único guard real.
 */
@Injectable()
export class BusinessReportsService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly expensesService: ExpensesService,
    private readonly employeesService: EmployeesService,
    private readonly servicesService: ServicesService,
    private readonly commerceResolver: CommerceResolverService,
    private readonly accountTypeResolver: AccountTypeResolver,
    @Inject(PERMISSIONS_FACADE) private readonly permissions: PermissionsFacade,
  ) {}

  async getSummary(userId: string, role: Role) {
    const accountType = await this.accountTypeResolver.resolve(userId);

    // Un freelancer no tiene Commerce/Expense/Employee: su reporte de
    // negocio se basa en ServiceRequest (solicitudes recibidas), no en
    // Order/Expense — mismo criterio que ya vivía en reports.vue.
    if (accountType === 'FREELANCER') {
      const orders = await this.servicesService.getMyServiceRequestsStats(userId);
      return { isFreelancer: true, orders, expenses: null, employees: null };
    }

    const commerceId = await this.commerceResolver.resolve(userId);
    const [orders, expenses, employees] = await Promise.all([
      this.ordersService.getStats(commerceId),
      this.expensesService.getStats(commerceId),
      // Igual que el 403 silencioso que ya manejaba el frontend
      // (employeeForbidden en reports.vue): si el usuario no tiene
      // employees:view, esa sección se omite en vez de fallar toda la
      // respuesta — el resto del reporte sigue siendo válido.
      this.permissions.hasEffectivePermission(userId, role, 'employees:view')
        .then((allowed) => (allowed ? this.employeesService.getStats(userId) : null)),
    ]);

    return { isFreelancer: false, orders, expenses, employees };
  }
}
