/**
 * Única fuente de verdad para leer variables de entorno en el backend.
 *
 * Cada variable se nombra, se interpreta y recibe su valor por defecto UNA
 * sola vez, aquí. El resto del código importa `appConfig` en vez de leer
 * `process.env` (la regla de ESLint `no-restricted-properties` lo impide
 * fuera de src/config/).
 *
 * Los valores se leen en el momento de cada llamada (no al importar): los
 * tests cambian variables entre casos (p. ej. PROTECTED_PAYMENTS_ENABLED) y
 * deben ver el cambio. Leer process.env es barato.
 *
 * La validación de lo obligatorio (DATABASE_URL, JWT_SECRET...) y del formato
 * de lo opcional se hace al arrancar en ./env.ts, con los mismos nombres.
 *
 * Las variables que consumen módulos de Nest vía ConfigService (JWT, Redis,
 * Telegram, reCAPTCHA, Google OAuth) siguen leyéndose así: también vienen de
 * process.env y quedan validadas por ./env.ts.
 */

type Env = Record<string, string | undefined>;
const raw = (name: string): string | undefined => {
  const value = (process.env as Env)[name];
  return value === undefined || value.trim() === '' ? undefined : value.trim();
};

/** Interruptor: encendido solo con el texto exacto 'true'. */
const flag = (name: string): boolean => raw(name) === 'true';

/** Número positivo, o el valor por defecto si falta o no es válido. */
const positiveNumber = (name: string, fallback: number): number => {
  const value = Number(raw(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

export const appConfig = {
  // ─── Aplicación ────────────────────────────────────────────────────────────
  appEnv: (): 'development' | 'test' | 'production' => {
    const value = raw('APP_ENV');
    return value === 'development' || value === 'test' ? value : 'production';
  },
  isDevelopment: (): boolean => raw('APP_ENV') === 'development',
  port: (): number => positiveNumber('PORT', 3001),
  /** URL pública del frontend, sin barra final (enlaces en correos, CORS...). */
  frontendUrl: (): string =>
    (raw('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL).replace(/\/+$/, ''),

  build: () => ({
    version: raw('APP_VERSION') ?? '1.0.0',
    sha: raw('GIT_SHA') ?? 'unknown',
    buildTime: raw('BUILD_TIME'),
  }),

  // ─── Infraestructura ──────────────────────────────────────────────────────
  redis: () => ({
    host: raw('REDIS_HOST') ?? 'localhost',
    port: positiveNumber('REDIS_PORT', 6379),
    password: raw('REDIS_PASSWORD'),
  }),

  mail: () => ({
    host: raw('MAIL_HOST') ?? 'smtp.gmail.com',
    port: positiveNumber('MAIL_PORT', 587),
    secure: flag('MAIL_SECURE'),
    user: raw('MAIL_USER'),
    pass: raw('MAIL_PASS'),
    fromName: raw('MAIL_FROM_NAME') ?? 'WorkPlace Manager',
    fromAddress: raw('MAIL_USER') ?? 'noreply@workplacemanager.com',
  }),

  /**
   * Cuenta de servicio de Firebase (push): el JSON completo en una variable,
   * o las tres sueltas. La clave privada admite "\n" escapados (una línea).
   */
  firebase: () => ({
    serviceAccountJson: raw('FIREBASE_SERVICE_ACCOUNT_JSON'),
    projectId: raw('FIREBASE_PROJECT_ID'),
    clientEmail: raw('FIREBASE_CLIENT_EMAIL'),
    privateKey: raw('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
  }),

  // ─── Negocio ──────────────────────────────────────────────────────────────
  /**
   * IVA sobre la comisión de la plataforma, en porcentaje. Sin definir: 16.
   * 0 lo desactiva; un valor inválido o negativo cuenta como 0.
   */
  platformVatRate: (): number => {
    const value = raw('PLATFORM_VAT_RATE');
    if (value === undefined) return 16;
    const rate = Number(value);
    return Number.isFinite(rate) && rate >= 0 ? rate : 0;
  },

  /** Plazos de la garantía de pedidos de catálogo, en días. */
  catalogEscrow: () => ({
    responseDays: positiveNumber('CATALOG_ESCROW_RESPONSE_DAYS', 3),
    autoReleaseDays: positiveNumber('CATALOG_ESCROW_AUTO_RELEASE_DAYS', 7),
  }),

  /**
   * Interruptores de funciones con implicaciones legales o regulatorias.
   * Todos apagados por defecto: se encienden con 'true' una vez validados
   * por asesoría legal/contable.
   * - PROTECTED_PAYMENTS_ENABLED: Pago Protegido (la plataforma custodia el
   *   dinero del comprador). Apagado tampoco hay billetera.
   * - BNPL_ENABLED: financiamiento Cashea/Krece (sin integración real aún).
   * - USAGE_CREDITS_ENABLED: créditos de uso prepagados.
   * - MESSANGI_SMS_ENABLED: verificación de teléfono por SMS (OTP).
   */
  features: {
    protectedPayments: (): boolean => flag('PROTECTED_PAYMENTS_ENABLED'),
    bnpl: (): boolean => flag('BNPL_ENABLED'),
    usageCredits: (): boolean => flag('USAGE_CREDITS_ENABLED'),
    /**
     * Verificación de teléfono por SMS (Messangi) lista para usarse: el
     * interruptor encendido y las credenciales y el secreto del OTP cargados.
     * Sin esto ningún usuario puede llegar a PHONE_VERIFIED.
     */
    phoneVerification: (): boolean =>
      flag('MESSANGI_SMS_ENABLED') &&
      Boolean(raw('MESSANGI_API_KEY')) &&
      Boolean(raw('MESSANGI_SMS_FROM')) &&
      Boolean(raw('PHONE_OTP_SECRET')),
  },
};
