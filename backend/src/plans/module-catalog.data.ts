export interface ModuleMeta {
  key: string;
  label: string;
}

// Fuente única de labels de módulo, superset de ALL_MODULES (módulos de
// negocio, plan-limits.service.ts) más los módulos "de sistema" que solo
// existen como agrupador en la Permission Matrix (users, permissions, etc.).
export const MODULE_CATALOG: ModuleMeta[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'menu', label: 'Menú' },
  { key: 'inventory', label: 'Inventario' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'customers', label: 'Clientes' },
  { key: 'appointments', label: 'Agendamientos' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'expenses', label: 'Gastos' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'reports', label: 'Reportes' },
  { key: 'sales', label: 'Ventas' },
  { key: 'employees', label: 'Empleados' },
  { key: 'branches', label: 'Sucursales' },
  { key: 'settings', label: 'Configuración' },
  { key: 'notifications', label: 'Notificaciones' },
  { key: 'services', label: 'Servicios' },
  { key: 'service_requests', label: 'Solicitudes de servicio' },
  { key: 'catalog', label: 'Catálogo' },
  { key: 'corridas', label: 'Corridas' },
  { key: 'wallets', label: 'Billetera' },
  // Módulos de sistema (sin plan/categoría propia, solo agrupan permisos)
  { key: 'users', label: 'Usuarios' },
  { key: 'permissions', label: 'Permisos' },
  { key: 'audit', label: 'Auditoría' },
  { key: 'logs', label: 'Logs' },
  { key: 'plans', label: 'Planes' },
  { key: 'exchange_rates', label: 'Tasas de Cambio' },
  { key: 'platform_fees', label: 'Comisiones' },
  { key: 'search', label: 'Búsqueda' },
  { key: 'search_tabs', label: 'Tabs de Búsqueda' },
  { key: 'locations', label: 'Ubicaciones (VE)' },
  { key: 'categories_global', label: 'Categorías' },
  { key: 'categories_user', label: 'Categorías Propuestas' },
  { key: 'cash', label: 'Caja' },
];
