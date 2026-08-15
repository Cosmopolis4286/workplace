import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const MIN_SCORE = 0.5;

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private config: ConfigService) {}

  get isEnabled(): boolean {
    return !!this.config.get('RECAPTCHA_SECRET_KEY');
  }

  /**
   * Verifica un token de reCAPTCHA v3 contra la API de Google.
   * Si no hay RECAPTCHA_SECRET_KEY configurada (dev/test), no bloquea —
   * simétrico con el frontend, que tampoco ejecuta el challenge sin site key.
   */
  async verify(token: string | undefined, action: string, ip?: string): Promise<boolean> {
    const secret = this.config.get('RECAPTCHA_SECRET_KEY');
    if (!secret) return true;

    if (!token) {
      this.logger.warn(`reCAPTCHA rechazado: token ausente (action=${action})`);
      return false;
    }

    try {
      const { data } = await axios.post(VERIFY_URL, null, {
        params: { secret, response: token, remoteip: ip },
        timeout: 5000,
      });

      if (!data.success) {
        this.logger.warn(`reCAPTCHA rechazado (action=${action}): ${JSON.stringify(data['error-codes'])}`);
        return false;
      }
      if (data.action !== action) {
        this.logger.warn(`reCAPTCHA action mismatch: esperado=${action} recibido=${data.action}`);
        return false;
      }
      if (typeof data.score === 'number' && data.score < MIN_SCORE) {
        this.logger.warn(`reCAPTCHA score bajo (action=${action}): ${data.score}`);
        return false;
      }
      return true;
    } catch (err) {
      // Fallo de red hacia Google no debe bloquear el login/registro —
      // se registra pero se deja pasar, igual que otros checks best-effort del proyecto.
      this.logger.error(`Error verificando reCAPTCHA (action=${action}): ${err.message}`);
      return true;
    }
  }
}
