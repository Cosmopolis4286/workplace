/**
 * Única fuente de verdad para la configuración del frontend (la usa
 * nuxt.config.ts; corre en Node al arrancar o compilar, no en el navegador).
 *
 * En la app, los valores se leen con useRuntimeConfig().public: nunca con
 * process.env ni import.meta.env sueltos.
 *
 * ── Desarrollo (`pnpm dev`) ─────────────────────────────────────────────────
 * Manda ../.env.dev. Las variables que defina ese archivo reemplazan a las de
 * Windows, la terminal y frontend/.env. Antes, como los .env nunca pisan
 * variables existentes, un API_URL o DOMAIN de producción definido en Windows
 * (o un NUXT_PUBLIC_API_URL en frontend/.env) hacía que el frontend local
 * llamara al API de producción.
 *
 * ── Build / generate / APK ──────────────────────────────────────────────────
 * No se toca nada: se usan las variables del entorno (p. ej.
 * NUXT_PUBLIC_API_URL="https://…/api" pnpm exec nuxt generate).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Lee un archivo KEY=VALUE (ignora comentarios y quita comillas que envuelvan el valor). */
export function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return vars
}

const isDevelopment = () => process.env.NODE_ENV !== 'production'

/**
 * En desarrollo, copia a process.env TODAS las variables de ../.env.dev,
 * reemplazando las que ya existieran. Devuelve las claves aplicadas.
 * En el contenedor frontend-dev no existe ../.env.dev: ahí el compose ya pasa
 * .env.dev como entorno (env_file), así que no hace falta.
 */
export function applyDevEnvFile(file = resolve(process.cwd(), '../.env.dev')): string[] {
  if (!isDevelopment() || !existsSync(file)) return []
  const vars = parseEnvFile(readFileSync(file, 'utf8'))
  const applied: string[] = []
  for (const [key, value] of Object.entries(vars)) {
    if (value === '') continue // vacío = "sin definir": no borra lo de otra fuente
    if (process.env[key] !== undefined && process.env[key] !== value) applied.push(key)
    process.env[key] = value
  }
  return applied
}

/** Configuración pública del frontend: cada clave se define UNA vez, aquí. */
export function publicConfig() {
  const env = process.env
  const apiUrl = env.API_URL || '/api'
  return {
    apiUrl,
    siteUrl: env.NUXT_PUBLIC_SITE_URL || 'https://workplace-manager.app',
    environment: env.APP_ENV || 'production',
    useDemoCredentials: env.USE_DEMO === 'true',
    recaptchaSiteKey: env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
    sentryDsn: env.NUXT_PUBLIC_SENTRY_DSN || '',
  }
}

/**
 * Prepara el entorno y devuelve runtimeConfig.public. En desarrollo, además
 * fija NUXT_PUBLIC_API_URL al valor de .env.dev: Nuxt aplica las variables
 * NUXT_PUBLIC_* en tiempo de ejecución por encima de nuxt.config, y un
 * NUXT_PUBLIC_API_URL suelto en frontend/.env volvía a apuntar a producción.
 */
export function loadFrontendConfig() {
  const overridden = applyDevEnvFile()
  if (overridden.length) {
    console.warn(
      `⚠️  .env.dev reemplaza variables que ya existían en Windows/la terminal: ${overridden.join(', ')}.\n` +
        '   Si no las necesitas, bórralas del sistema para evitar sorpresas en otras herramientas.'
    )
  }
  const config = publicConfig()
  if (isDevelopment() && process.env.API_URL) {
    process.env.NUXT_PUBLIC_API_URL = config.apiUrl
  }
  return config
}
