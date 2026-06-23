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
      const current = await this.redis.get(key);
      const requests = current ? parseInt(current) : 0;

      // Si ya excedió el límite
      if (requests >= options.maxRequests) {
        this.logger.warn(`Rate limit exceeded for key: ${key}`, {
          requests,
          maxRequests: options.maxRequests,
          ip: request.ip,
          userAgent: request.headers['user-agent']
        });

        const lang = I18nContext.current(context)?.lang;
        throw new ForbiddenException(
          this.i18n.t('common.rate_limit.exceeded', {
            lang,
            args: { wait: this.formatWaitTime(options.windowMs, lang) },
          })
        );
      }

      // Incrementar contador
      const newCount = requests + 1;
      await this.redis.setex(key, Math.ceil(options.windowMs / 1000), newCount.toString());

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
