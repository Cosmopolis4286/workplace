import type { CreateNotificationDto } from './dto/create-notification.dto';

/**
 * Contrato público de NotificationsService para otros dominios que solo
 * necesitan avisar a un usuario (p. ej. money/wallets al pagar o rechazar un
 * retiro). Expone únicamente la creación de notificaciones.
 */
export interface NotificationsFacade {
  createForUser(userId: string, dto: CreateNotificationDto): Promise<unknown>;
}

export const NOTIFICATIONS_FACADE = Symbol('NOTIFICATIONS_FACADE');
