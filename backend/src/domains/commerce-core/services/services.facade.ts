import type { ServicesService } from './services.service';

/**
 * Contrato público de ServicesService para otros dominios:
 * - platform/ai-orchestrator: buscar servicios y crear la solicitud.
 * - platform/reports: estadísticas del proveedor.
 * - money/wallets: reintentar escrows en PENDING_FUNDS tras un depósito
 *   (resuelto con ModuleRef para no crear un ciclo de módulos).
 * - money/escrow-funding: retener la garantía de la solicitud que el cliente
 *   pagó a una cuenta de la plataforma.
 * Es un Pick del servicio: las firmas siguen al servicio sin duplicarse.
 */
export type ServicesFacade = Pick<
  ServicesService,
  | 'createServiceRequest'
  | 'getCatalogServices'
  | 'getMyServiceRequestsStats'
  | 'retryPendingEscrowsForClient'
  | 'retryPendingEscrowForRequest'
>;

export const SERVICES_FACADE = Symbol('SERVICES_FACADE');
