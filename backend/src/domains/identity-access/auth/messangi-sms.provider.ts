import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OutboundSms {
  to: string;
  text: string;
  externalId: string;
  clientId: string;
}

@Injectable()
export class MessangiSmsProvider {
  private readonly logger = new Logger(MessangiSmsProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: OutboundSms): Promise<void> {
    const enabled = this.config.get<string>('MESSANGI_SMS_ENABLED') === 'true';
    const apiKey = this.config.get<string>('MESSANGI_API_KEY');
    const sender = this.config.get<string>('MESSANGI_SMS_FROM');

    if (!enabled || !apiKey || !sender) {
      throw new ServiceUnavailableException(
        'El proveedor de SMS no está habilitado'
      );
    }

    try {
      await axios.post(
        'https://elastic.messangi.me/raven/v3/messages',
        {
          from: sender,
          text: message.text,
          to: message.to,
          type: 'MT',
          requestDR: true,
          externalId: message.externalId,
          clientId: message.clientId,
        },
        {
          timeout: 10_000,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      this.logger.warn(
        `Messangi SMS request failed (HTTP ${status ?? 'unknown'})`
      );
      throw new ServiceUnavailableException(
        'No se pudo enviar el SMS. Inténtalo nuevamente'
      );
    }
  }
}
