import { Inject, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ORDERS_FACADE,
  OrdersFacade,
} from '../../operations/orders/orders.facade';
import {
  EXPENSES_FACADE,
  ExpensesFacade,
} from '../../operations/expenses/expenses.facade';
import {
  EMPLOYEES_FACADE,
  EmployeesFacade,
} from '../../commerce-core/employees/employees.facade';
import {
  SERVICES_FACADE,
  ServicesFacade,
} from '../../commerce-core/services/services.facade';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';
import { CapabilitiesService } from '../../../common/capabilities/capabilities.service';
import {
  PermissionsFacade,
  PERMISSIONS_FACADE,
} from '../../identity-access/permissions/permissions.facade';

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
    @Inject(ORDERS_FACADE) private readonly ordersService: OrdersFacade,
    @Inject(EXPENSES_FACADE) private readonly expensesService: ExpensesFacade,
    @Inject(EMPLOYEES_FACADE)
    private readonly employeesService: EmployeesFacade,
    @Inject(SERVICES_FACADE) private readonly servicesService: ServicesFacade,
    private readonly commerceResolver: CommerceResolverService,
    private readonly capabilities: CapabilitiesService,
    @Inject(PERMISSIONS_FACADE) private readonly permissions: PermissionsFacade
  ) {}

  async getSummary(userId: string, role: Role) {
    // Sin Commerce no hay Order/Expense/Employee: el reporte se basa en
    // ServiceRequest (solicitudes recibidas). Se decide por el HECHO (¿tiene
    // Commerce?) y no por accountType: un PROFESSIONAL que vende producto
    // ("opción 2") tiene Commerce y su reporte real son sus pedidos.
    if (!(await this.capabilities.has(userId, 'HAS_COMMERCE'))) {
      const orders =
        await this.servicesService.getMyServiceRequestsStats(userId);
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
      this.permissions
        .hasEffectivePermission(userId, role, 'employees:view')
        .then((allowed) =>
          allowed ? this.employeesService.getStats(userId) : null
        ),
    ]);

    return { isFreelancer: false, orders, expenses, employees };
  }

  // SUPERADMIN/ADMIN: mismo reporte pero agregado sobre TODA la plataforma
  // (todos los comercios) en vez de resolver un Commerce propio que no
  // tienen. Gateado por platform:monitor, no por reports:view — ver
  // ROLE_DEFAULTS en seed.js, que ya no concede reports:view a estos roles.
  async getPlatformSummary() {
    const [orders, expenses, employees] = await Promise.all([
      this.ordersService.getPlatformStats(),
      this.expensesService.getPlatformStats(),
      this.employeesService.getPlatformStats(),
    ]);

    return { isFreelancer: false, orders, expenses, employees };
  }
}
