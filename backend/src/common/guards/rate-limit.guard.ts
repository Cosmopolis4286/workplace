import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { RedisService } from '../../redis/redis.service';
import { Request } from 'express';

export interface RateLimitOptions {
  windowMs: number;    // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo de solicitudes permitidas
  keyGenerator?: (req: Request) => string; // Generador de clave personalizado
  skipSuccessfulRequests?: boolean; // No contar requests exitosas
  skipFailedRequests?: boolean; // No contar requests fallidas
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly i18n: I18nService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const options = this.reflector.get<RateLimitOptions>('rateLimit', context.getHandler()) ||
                   this.reflector.get<RateLimitOptions>('rateLimit', context.getClass());

    if (!options) {
      return true; // Sin rate limiting si no hay opciones
    }

    const key = options.keyGenerator
      ? options.keyGenerator(request)
      : this.generateDefaultKey(request);

    return await this.checkRateLimit(key, options, request, context);
  }

  private async checkRateLimit(
    key: string,
    options: RateLimitOptions,
    request: Request,
    context: ExecutionContext
  ): Promise<boolean> {
    try {
      // Atómico: INCR no puede sufrir la carrera de un GET+SETEX separado,
      // donde dos requests concurrentes leen el mismo contador antes de que
      // ninguna escriba y ambas pasan el límite (ver RedisService.incrWithExpire).
      const newCount = await this.redis.incrWithExpire(key, Math.ceil(options.windowMs / 1000));

      // Si ya excedió el límite
      if (newCount > options.maxRequests) {
        this.logger.warn(`Rate limit exceeded for key: ${key}`, {
          requests: newCount,
          maxRequests: options.maxRequests,
          ip: request.ip,
          userAgent: request.headers['user-agent']
        });

        // TTL real de la key en Redis — más preciso que options.windowMs
        // fijo, porque refleja cuánto falta realmente para que expire el
        // contador (windowMs es la duración total de la ventana, no lo que
        // queda de ella en este momento).
        const retryAfterSeconds = Math.max(1, await this.redis.ttl(key));
        const response = context.switchToHttp().getResponse();
        response?.setHeader?.('Retry-After', String(retryAfterSeconds));

        const lang = I18nContext.current(context)?.lang;
        throw new ForbiddenException({
          message: this.i18n.t('common.rate_limit.exceeded', {
            lang,
            args: { wait: this.formatWaitTime(retryAfterSeconds * 1000, lang) },
          }),
          errorCode: 'RATE_LIMITED',
          retryAfterSeconds,
        });
      }

      // Logging para monitoreo
      if (newCount > Math.floor(options.maxRequests * 0.8)) {
        this.logger.warn(`Rate limit warning for key: ${key}`, {
          requests: newCount,
          maxRequests: options.maxRequests,
          percentage: Math.round((newCount / options.maxRequests) * 100)
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error checking rate limit for key: ${key}`, error);
      return true; // Permitir si hay error en Redis (fail-open)
    }
  }

  private formatWaitTime(windowMs: number, lang?: string): string {
    const totalSeconds = Math.ceil(windowMs / 1000);
    if (totalSeconds < 60) {
      return this.i18n.t('common.rate_limit.wait_seconds', {
        lang,
        args: { count: totalSeconds },
      });
    }
    const minutes = Math.ceil(totalSeconds / 60);
    return this.i18n.t('common.rate_limit.wait_minutes', {
      lang,
      args: { count: minutes },
    });
  }

  private generateDefaultKey(request: Request): string {
    const ip = this.getClientIP(request);
    const path = request.route?.path || request.path;
    return `rate-limit:${ip}:${path}`;
  }

  // request.ip ya resuelve correctamente x-forwarded-for según la cantidad
  // de proxies configurada en `app.set('trust proxy', N)` (ver main.ts).
  // Leer los headers a mano aquí permitiría que cualquier cliente los
  // falsifique para resetear su propio rate limit en cada request.
  private getClientIP(request: Request): string {
    return request.ip || request.socket?.remoteAddress || '127.0.0.1';
  }
}

// Decorator para configurar rate limiting
export const RateLimit = (options: RateLimitOptions) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      // Para métodos
      Reflect.defineMetadata('rateLimit', options, descriptor.value);
    } else {
      // Para clases
      Reflect.defineMetadata('rateLimit', options, target);
    }
  };
};
