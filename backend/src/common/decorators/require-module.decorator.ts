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
 * Responde "¿su rubro y su plan incluyen esto?" — nada más. El papel lo
 * decide @RequirePermission (matriz rol base + perfil) y, para los módulos
 * cuyos datos tienen FK a Commerce (COMMERCE_BOUND_MODULES en
 * common/capabilities/module-requirements.ts), ModuleAccessGuard exige
 * además HAS_COMMERCE. Un PROFESSIONAL de "Comida" usa menu/orders; un
 * BUSINESS de "Tecnología" no — UserCategory.allowedModules lo codifica.
 * Usage: @RequireModule('menu')
 */
export const RequireModule = (module: string) =>
  SetMetadata(MODULE_KEY, module);
