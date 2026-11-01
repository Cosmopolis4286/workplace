import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ThrottlerGuard,
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { accessTokenExtractor } from '../utils/jwt-extractor.util';

@Injectable()
export class SpanishThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly i18n: I18nService,
    private readonly config: ConfigService
  ) {
    super(options, storageService, reflector);
  }

  private readonly jwt = new JwtService();

  // Con sesión válida se cuenta por usuario y no por IP: las operadoras
  // móviles comparten una IP entre muchos clientes (CGNAT) y un límite por
  // IP los bloquearía entre sí. El token se verifica (no solo se decodifica)
  // para que nadie pueda repartir sus peticiones entre "usuarios" inventados.
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const token = accessTokenExtractor(req as any);
    if (token) {
      try {
        const payload = this.jwt.verify<{ sub?: string }>(token, {
          secret: this.config.get<string>('JWT_SECRET'),
        });
        if (payload?.sub) return `user:${payload.sub}`;
      } catch {
        // Token inválido o expirado: se cuenta por IP.
      }
    }
    return `ip:${req.ip}`;
  }

  private buildMessage(seconds: number, lang?: string): string {
    const wait =
      seconds < 60
        ? this.i18n.t('common.rate_limit.wait_seconds', {
            lang,
            args: { count: seconds },
          })
        : this.i18n.t('common.rate_limit.wait_minutes', {
            lang,
            args: { count: Math.ceil(seconds / 60) },
          });

    return this.i18n.t('common.rate_limit.exceeded', { lang, args: { wait } });
  }

  protected async getErrorMessage(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<string> {
    const lang = I18nContext.current(context)?.lang;
    return this.buildMessage(
      Math.ceil(throttlerLimitDetail.timeToExpire),
      lang
    );
  }

  // Sobreescribe el throw por defecto (que solo acepta un string como
  // ThrottlerException) para poder exponer retryAfterSeconds/errorCode
  // estructurados en el body — el frontend no debe tener que parsear el
  // mensaje en prosa para saber cuánto esperar (ver useApiErrors.ts).
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    const lang = I18nContext.current(context)?.lang;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(throttlerLimitDetail.timeToExpire)
    );

    const response = context.switchToHttp().getResponse();
    response?.setHeader?.('Retry-After', String(retryAfterSeconds));

    throw new HttpException(
      {
        message: this.buildMessage(retryAfterSeconds, lang),
        errorCode: 'RATE_LIMITED',
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
