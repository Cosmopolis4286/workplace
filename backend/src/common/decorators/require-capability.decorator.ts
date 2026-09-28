import { SetMetadata } from '@nestjs/common';
import type { Capability } from '../capabilities/capabilities.service';

export const CAPABILITY_KEY = 'required_capabilities';

/**
 * Exige prerrequisitos operativos (ver CapabilitiesService) — todos los
 * listados. Reemplaza @RequireAccountType: "es de tipo COMMERCE" mezclaba
 * "este papel puede" (eso ya lo dice @RequirePermission) con "existe el
 * Commerce sobre el que opera" (esto).
 * Usage: @RequireCapability('HAS_COMMERCE')
 */
export const RequireCapability = (...capabilities: Capability[]) =>
  SetMetadata(CAPABILITY_KEY, capabilities);
