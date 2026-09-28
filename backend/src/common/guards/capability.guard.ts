import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CAPABILITY_KEY } from '../decorators/require-capability.decorator';
import { Capability, CapabilitiesService } from '../capabilities/capabilities.service';

const MESSAGE_BY_CAPABILITY: Record<Capability, string> = {
  HAS_COMMERCE: 'Esta función requiere un comercio activo en tu cuenta',
  HAS_PROFESSIONAL_PROFILE: 'Esta función requiere un perfil profesional activo',
  HAS_BUSINESS_PROFILE: 'Esta función requiere un perfil de negocio activo',
};

/**
 * Sin bypass para SUPERADMIN/ADMIN a propósito: una capacidad es un hecho
 * sobre los datos (¿existe el Commerce?), no un permiso. Un admin sin
 * Commerce propio no puede operar uno — sus vistas son las de plataforma
 * (platform:monitor). Antes AccountTypeGuard los dejaba pasar y el service
 * operaba sobre `userId` como si fuera un commerceId (datos vacíos, o 400 por
 * FK al escribir).
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly capabilities: CapabilitiesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Capability[]>(CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const resolved = await this.capabilities.resolve(user.id);
    const missing = required.find((c) => !resolved[c]);
    if (missing) throw new ForbiddenException(MESSAGE_BY_CAPABILITY[missing]);
    return true;
  }
}
