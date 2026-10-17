import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Único punto de salida para toda excepción no atrapada por un controller.
 * Preserva el shape { statusCode, message, error } que ya espera el frontend
 * para HttpException; para todo lo demás (Prisma, errores de programación)
 * responde un 500 genérico y nunca expone el stack al cliente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception);

    this.log(exception, request, status);

    response.status(status).json({
      ...body,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): {
    status: number;
    body: Record<string, any>;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const body =
        typeof response === 'string' ? { message: response } : response;
      return {
        status,
        body: {
          statusCode: status,
          error: exception.name,
          ...(body as object),
        },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'InternalServerError',
        message: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
      },
    };
  }

  private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(
          ', '
        );
        return {
          status: HttpStatus.CONFLICT,
          body: {
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: target
              ? `Ya existe un registro con ese ${target}.`
              : 'Registro duplicado.',
          },
        };
      }
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          body: {
            statusCode: HttpStatus.NOT_FOUND,
            error: 'NotFound',
            message: 'El registro solicitado no existe.',
          },
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          body: {
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: 'La operación viola una referencia existente.',
          },
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'InternalServerError',
            message: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
          },
        };
    }
  }

  private log(exception: unknown, request: Request, status: number) {
    const message = `${request.method} ${request.url} → ${status}`;
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (status >= 500) {
      this.logger.error(message, stack);
    } else if (status >= 400) {
      this.logger.warn(message);
    }
  }
}
