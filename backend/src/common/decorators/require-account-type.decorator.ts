import { SetMetadata } from '@nestjs/common';

export const ACCOUNT_TYPE_KEY = 'required_account_type';

/**
 * Marca un endpoint como exclusivo de un tipo de cuenta de negocio
 * (COMMERCE/FREELANCER). Reemplaza los `if (role === 'FREELANCER') throw...`
 * que antes vivían duplicados dentro de cada service (ver menu.service.ts,
 * settings.service.ts). RBAC ya suele negar el acceso vía @RequirePermission,
 * esto es defensa en profundidad para el caso de un UserPermission
 * individual que lo sobreescriba.
 * Usage: @RequireAccountType('COMMERCE')
 */
export const RequireAccountType = (accountType: 'COMMERCE' | 'FREELANCER') =>
  SetMetadata(ACCOUNT_TYPE_KEY, accountType);
