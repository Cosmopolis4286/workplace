import type { ServicesService } from './services.service';

/**
 * Contrato público de ServicesService para otros dominios:
 * - platform/ai-orchestrator: buscar servicios y crear la solicitud.
 * - platform/reports: estadísticas del proveedor.
 * - money/wallets: reintentar escrows en PENDING_FUNDS tras un depósito
 *   (resuelto con ModuleRef para no crear un ciclo de módulos).
 * Es un Pick del servicio: las firmas siguen al servicio sin duplicarse.
 */
export type ServicesFacade = Pick<
  ServicesService,
  | 'createServiceRequest'
  | 'getCatalogServices'
  | 'getMyServiceRequestsStats'
  | 'retryPendingEscrowsForClient'
>;

export const SERVICES_FACADE = Symbol('SERVICES_FACADE');
