import { BillingInterval, Prisma } from '@prisma/client';

/**
 * Contrato público de PlansService para otros dominios. Hoy solo
 * identity-access/profile-activations: al aprobar el alta de un PROFESIONAL
 * con plan pago pendiente, activa la suscripción dentro de SU transacción
 * (por eso recibe el TransactionClient). La administración de planes y
 * suscripciones queda en PlansController, intra-módulo.
 */
export interface PlansFacade {
  activateSubscriptionForPlan(
    tx: Prisma.TransactionClient,
    userId: string,
    planId: string,
    interval: BillingInterval,
    adminId: string
  ): Promise<unknown>;
}

export const PLANS_FACADE = Symbol('PLANS_FACADE');
