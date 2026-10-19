import type { EmployeesService } from './employees.service';

/** Lectura de estadísticas de empleados para platform/reports. */
export type EmployeesFacade = Pick<
  EmployeesService,
  'getStats' | 'getPlatformStats'
>;

export const EMPLOYEES_FACADE = Symbol('EMPLOYEES_FACADE');
