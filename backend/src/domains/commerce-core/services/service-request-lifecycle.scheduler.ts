import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServicesService } from './services.service';

// Plazos de las solicitudes: cierra las que el proveedor terminó y el cliente
// no confirmó a tiempo (closeUnconfirmedCompletions) y vence las garantías
// que nadie pagó (expireUnpaidGuarantees).
@Injectable()
export class ServiceRequestLifecycleScheduler {
  private readonly logger = new Logger(ServiceRequestLifecycleScheduler.name);

  constructor(private readonly services: ServicesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleLifecycle() {
    try {
      const { checked, closed } =
        await this.services.closeUnconfirmedCompletions();
      if (checked > 0) {
        this.logger.log(`Cierre automático: ${closed}/${checked} solicitudes`);
      }
      const { cancelled, increasesExpired } =
        await this.services.expireUnpaidGuarantees();
      if (cancelled + increasesExpired > 0) {
        this.logger.log(
          `Garantías vencidas: ${cancelled} solicitudes canceladas, ${increasesExpired} aumentos sin efecto`
        );
      }
    } catch (error) {
      this.logger.error('Service request lifecycle check failed:', error);
    }
  }
}
