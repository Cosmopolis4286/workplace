import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DatabasePoolGuard implements CanActivate {
  private readonly maxConnections = 15; // Límite para 4GB RAM
  private static activeConnections = 0;

  canActivate(context: ExecutionContext): boolean {
    // Incrementar contador
    DatabasePoolGuard.activeConnections++;

    // Verificar límite
    if (DatabasePoolGuard.activeConnections > this.maxConnections) {
      DatabasePoolGuard.activeConnections--;
      console.warn(
        `🚫 DB Pool Guard: Rejecting request - ${DatabasePoolGuard.activeConnections}/${this.maxConnections} connections`
      );

      // Responder con 429 Too Many Requests
      const response = context.switchToHttp().getResponse();
      response.status(429).json({
        error: 'Database pool temporarily unavailable',
        message: 'Too many concurrent database connections',
        retryAfter: 5, // Sugerir retry en 5 segundos
      });

      return false;
    }

    console.log(
      `✅ DB Pool Guard: Allowing request - ${DatabasePoolGuard.activeConnections}/${this.maxConnections} connections`
    );
    return true;
  }

  // Método estático para liberar conexiones
  static releaseConnection(): void {
    DatabasePoolGuard.activeConnections--;
    console.log(
      `🔌 DB Pool Guard: Connection released - ${DatabasePoolGuard.activeConnections}/15 connections`
    );
  }
}
