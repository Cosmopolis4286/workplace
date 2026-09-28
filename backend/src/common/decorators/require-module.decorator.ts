import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'required_module';

/**
 * Marca un endpoint (o controller entero) como perteneciente a un módulo de
 * negocio (el mismo nombre usado en SystemModule.name / plan.enabledModules /
 * userCategory.allowedModules). ModuleAccessGuard verifica el request real
 * contra PlanLimitsService.assertModuleAccess(userId, module) — plan ∩
 * categoría, el mismo cálculo que ya alimenta el sidebar (effectiveModules)
 * — así el enforcement real nunca puede otorgar menos ni más que lo que el
 * sidebar promete.
 *
 * Reemplaza a @RequireAccountType('COMMERCE') en los módulos donde el eje
 * real de acceso es la categoría de negocio del usuario (¿vende producto
 * físico?), no si tiene un Commerce formal — ver menu/orders/customers/
 * delivery: un FREELANCER de categoría "Comida" sí necesita menu/orders, un
 * COMMERCE de categoría "Tecnología" no, y UserCategory.allowedModules ya
 * codifica esa distinción correctamente por categoría.
 * Usage: @RequireModule('menu')
 */
export const RequireModule = (module: string) => SetMetadata(MODULE_KEY, module);
