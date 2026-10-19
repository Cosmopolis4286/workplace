import type { OrdersService } from './orders.service';

/** Lectura de estadísticas de pedidos para platform/reports. */
export type OrdersFacade = Pick<OrdersService, 'getStats' | 'getPlatformStats'>;

export const ORDERS_FACADE = Symbol('ORDERS_FACADE');
