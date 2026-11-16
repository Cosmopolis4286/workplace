import { z } from 'zod';

// En los .env una variable vacía (`FOO=`) significa "sin definir".
const blankAsUndefined = (schema: z.ZodTypeAny) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const featureFlag = blankAsUndefined(
  z.enum(['true', 'false'], { message: "debe ser 'true' o 'false'" })
);

export const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Database
  DATABASE_URL: z
    .string()
    .url()
    .startsWith(
      'postgresql://',
      'DATABASE_URL debe comenzar con postgresql://'
    ),

  // Redis
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().min(1),

  // JWT
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN debe ser ej. 15m, 1h, 7d'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_REFRESH_EXPIRES_IN debe ser ej. 7d, 30d'),

  // Cifrado (2FA - secretos TOTP en reposo, AES-256-GCM)
  ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-f]{64}$/i,
      'ENCRYPTION_KEY debe ser una clave hex de 64 caracteres (32 bytes) — generar con: openssl rand -hex 32'
    ),

  // CORS
  FRONTEND_URL: z.string().url(),

  // Google OAuth (opcionales — pueden estar vacías en dev sin OAuth)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // Demo (solo dev)
  DEMO_EMAIL: z.string().email().optional(),
  DEMO_PASSWORD: z.string().optional(),
  DEMO_COMMERCE: z.string().optional(),

  // Correo (verificación de email y recuperación de contraseña). Opcional:
  // sin él la app arranca, pero en producción se avisa (ver warnMissingMail).
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().optional(),
  MAIL_SECURE: z.enum(['true', 'false']).optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Variables opcionales con formato definido. Un error aquí NO impide
 * arrancar (en producción, una errata en un interruptor no debe tumbar el
 * servicio): se avisa al arrancar y app-config.ts usa su valor por defecto.
 */
export const optionalEnvSchema = z.object({
  // Proveedor SMS y OTP: opcionales hasta completar la configuración de Messangi.
  MESSANGI_SMS_ENABLED: featureFlag,
  MESSANGI_API_KEY: blankAsUndefined(z.string().min(1)),
  MESSANGI_SMS_FROM: blankAsUndefined(z.string().min(1)),
  PHONE_OTP_SECRET: blankAsUndefined(z.string().min(32)),

  // Interruptores (ver src/config/app-config.ts → features). Un valor como
  // 'yes' o 'TRUE' antes contaba como apagado sin avisar.
  PROTECTED_PAYMENTS_ENABLED: featureFlag,
  BNPL_ENABLED: featureFlag,
  USAGE_CREDITS_ENABLED: featureFlag,

  // Negocio (ver app-config.ts)
  PLATFORM_VAT_RATE: blankAsUndefined(
    z.coerce
      .number()
      .min(0)
      .max(100, 'PLATFORM_VAT_RATE es un porcentaje (0-100)')
  ),
  CATALOG_ESCROW_RESPONSE_DAYS: blankAsUndefined(z.coerce.number().positive()),
  CATALOG_ESCROW_AUTO_RELEASE_DAYS: blankAsUndefined(
    z.coerce.number().positive()
  ),

  // Push (Firebase): si se usa el JSON completo, que sea JSON válido.
  FIREBASE_SERVICE_ACCOUNT_JSON: blankAsUndefined(
    z.string().refine(
      (v) => {
        try {
          JSON.parse(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'no es un JSON válido' }
    )
  ),
});

/**
 * Errores de validación de un conjunto de variables, uno por línea, listos
 * para mostrar. Vacío = todo bien. Separado de env.ts (que corta el arranque
 * con process.exit) para poder probarlo.
 */
const issuesOf = (
  schema: z.ZodTypeAny,
  source: Record<string, string | undefined>
): string[] => {
  const result = schema.safeParse(source);
  if (result.success) return [];
  return result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );
};

/** Errores en variables obligatorias: impiden arrancar. */
export function envErrors(
  source: Record<string, string | undefined>
): string[] {
  return issuesOf(envSchema, source);
}

/** Variables opcionales mal escritas: solo se avisa (se usa el valor por defecto). */
export function envWarnings(
  source: Record<string, string | undefined>
): string[] {
  return issuesOf(optionalEnvSchema, source);
}
