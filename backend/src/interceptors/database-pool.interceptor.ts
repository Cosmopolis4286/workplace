import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class DatabasePoolInterceptor implements NestInterceptor {
  private readonly maxConnections = 15; // Límite para 4GB RAM
  private activeConnections = 0;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Verificar límite de conexiones
    if (this.activeConnections >= this.maxConnections) {
      console.warn(
        `🚫 Pool de DB saturado: ${this.activeConnections}/${this.maxConnections}`
      );
      return throwError(
        () =>
          new Error(
            'Database pool temporarily unavailable - too many connections'
          )
      );
    }

    // Incrementar contador de conexiones activas
    this.activeConnections++;
    console.log(
      `🔗 DB Connection: ${this.activeConnections}/${this.maxConnections}`
    );

    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Log éxito y tiempo de respuesta
        const duration = Date.now() - now;
        console.log(`✅ DB Query OK: ${duration}ms`);
      }),
      catchError((error) => {
        // Log error
        console.error(`❌ DB Query Error: ${error.message}`);
        return throwError(() => error);
      }),
      // Finalizar siempre (éxito o error)
      tap({
        finalize: () => {
          this.activeConnections--;
          console.log(
            `🔌 DB Connection released: ${this.activeConnections}/${this.maxConnections}`
          );
        },
      })
    );
  }
}
