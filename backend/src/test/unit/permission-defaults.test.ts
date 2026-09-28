/**
 * Contrato de prisma/permission-defaults.js (fuente de seed.js y de la
 * migración invert_profesional_role_permissions). Protege el modelo:
 *   - role=PROFESIONAL es la BASE común (intersección), nunca la unión — si
 *     vuelve a ser la unión, ProfilePermission deja de poder restringir y
 *     cada capa del frontend vuelve a necesitar listas de accountType.
 *   - La distinción comercio vs. profesional vive solo en los perfiles.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaults = require('../../../prisma/permission-defaults.js');

const {
  PERMISSIONS,
  ROLE_DEFAULTS,
  PROFILE_PERMISSION_DEFAULTS,
  BUSINESS_PROFILE_KEYS,
  PROFESSIONAL_PROFILE_KEYS,
  PRODUCT_SELLER_KEYS,
} = defaults as {
  PERMISSIONS: Array<{ key: string }>;
  ROLE_DEFAULTS: Record<'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL', string[]>;
  PROFILE_PERMISSION_DEFAULTS: Array<{ profileType: string; subtype: string | null; keys: string[] }>;
  BUSINESS_PROFILE_KEYS: string[];
  PROFESSIONAL_PROFILE_KEYS: string[];
  PRODUCT_SELLER_KEYS: string[];
};

const allKeys = new Set(PERMISSIONS.map((p) => p.key));

describe('permission-defaults', () => {
  it('every default key exists in the PERMISSIONS catalog', () => {
    const referenced = [
      ...Object.values(ROLE_DEFAULTS).flat(),
      ...PROFILE_PERMISSION_DEFAULTS.flatMap((p) => p.keys),
    ];
    expect(referenced.filter((k) => !allKeys.has(k))).toEqual([]);
  });

  it('role PROFESIONAL grants only what EVERY business profile grants (intersection, not union)', () => {
    for (const profile of PROFILE_PERMISSION_DEFAULTS) {
      const missing = ROLE_DEFAULTS.PROFESIONAL.filter((k) => !profile.keys.includes(k));
      expect({ profile: `${profile.profileType}/${profile.subtype}`, missing }).toEqual({
        profile: `${profile.profileType}/${profile.subtype}`,
        missing: [],
      });
    }
  });

  it('role PROFESIONAL does NOT grant business-only permissions (they come from the BUSINESS profile)', () => {
    const businessOnly = BUSINESS_PROFILE_KEYS.filter((k) => !PROFESSIONAL_PROFILE_KEYS.includes(k));
    expect(businessOnly.length).toBeGreaterThan(0);
    expect(ROLE_DEFAULTS.PROFESIONAL.filter((k) => businessOnly.includes(k))).toEqual([]);
  });

  it('business-only modules are exactly the commerce-operations modules', () => {
    const businessOnlyModules = new Set(
      BUSINESS_PROFILE_KEYS.filter((k) => !PROFESSIONAL_PROFILE_KEYS.includes(k)).map((k) => k.split(':')[0]),
    );
    expect([...businessOnlyModules].sort()).toEqual(
      ['accounts', 'appointments', 'branches', 'cash', 'employees', 'purchases', 'suppliers'].sort(),
    );
  });

  it('both PROFESSIONAL subtypes get the product-seller kit (option 2: the category decides real usage)', () => {
    const professional = PROFILE_PERMISSION_DEFAULTS.filter((p) => p.profileType === 'PROFESSIONAL');
    expect(professional.map((p) => p.subtype).sort()).toEqual(['FREELANCER', 'SERVICE_PROVIDER']);
    for (const p of professional) {
      expect(PRODUCT_SELLER_KEYS.filter((k) => !p.keys.includes(k))).toEqual([]);
    }
  });

  it('BUSINESS profile is a superset of the PROFESSIONAL profile', () => {
    expect(PROFESSIONAL_PROFILE_KEYS.filter((k) => !BUSINESS_PROFILE_KEYS.includes(k))).toEqual([]);
  });
});
