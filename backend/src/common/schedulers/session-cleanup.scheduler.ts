import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class SessionCleanupScheduler {
  private readonly logger = new Logger(SessionCleanupScheduler.name);

  constructor(private readonly authService: AuthService) {}

  // Ejecutar cleanup cada hora
  @Cron(CronExpression.EVERY_HOUR)
  async handleSessionCleanup() {
    this.logger.log('Starting scheduled session cleanup...');
    
    try {
      await this.authService.cleanupExpiredSessions();
      this.logger.log('Session cleanup completed successfully');
    } catch (error) {
      this.logger.error('Session cleanup failed:', error);
    }
  }

  // Ejecutar cleanup más ligero cada 15 minutos
  @Cron('*/15 * * * *')
  async handleLightCleanup() {
    try {
      // Solo limpiar sesiones muy antiguas (>2 horas)
      this.logger.debug('Running light cleanup...');
      // Implementar cleanup ligero si es necesario
    } catch (error) {
      this.logger.error('Light cleanup failed:', error);
    }
  }
}
