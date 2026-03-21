import { LoggerService, LogLevel } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Custom NestJS logger that persists WARN and ERROR entries to the SystemLog
 * table. INFO/DEBUG are written only to stdout to avoid flooding the DB.
 *
 * Must be instantiated with a raw PrismaClient (not via DI) because loggers
 * are registered before the DI container is fully booted.
 */
export class AuditLogger implements LoggerService {
  constructor(private readonly prisma: PrismaClient) {}

  log(message: any, context?: string) {
    this.print('LOG', message, context);
  }

  error(message: any, stack?: string, context?: string) {
    this.print('ERROR', message, context);
    this.persist('ERROR', message, context, stack).catch(() => {});
  }

  warn(message: any, context?: string) {
    this.print('WARN', message, context);
    this.persist('WARN', message, context).catch(() => {});
  }

  debug(message: any, context?: string) {
    this.print('DEBUG', message, context);
  }

  verbose(message: any, context?: string) {
    this.print('VERBOSE', message, context);
  }

  fatal(message: any, context?: string) {
    this.print('FATAL', message, context);
    this.persist('ERROR', message, context).catch(() => {});
  }

  setLogLevels?(_levels: LogLevel[]) {}

  // ─── Private ────────────────────────────────────────────────────────────────

  private print(level: string, message: any, context?: string) {
    const ts = new Date().toISOString();
    const ctx = context ? ` [${context}]` : '';
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    // eslint-disable-next-line no-console
    console.log(`[${ts}] ${level}${ctx} ${msg}`);
  }

  private async persist(
    level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG',
    message: any,
    context?: string,
    stack?: string
  ) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    await this.prisma.systemLog.create({
      data: { level, message: msg, context, stack },
    });
  }
}
