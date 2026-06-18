/**
 * Traduce/normaliza mensajes de error de la API al idioma activo.
 * Sirve de red de seguridad ante mensajes técnicos o en inglés
 * que puedan escapar del backend (ej. límites de tasa, excepciones genéricas).
 */

interface ApiErrorLike {
  data?: { message?: string | string[] }
  message?: string
}

type Translate = (key: string, params?: Record<string, unknown>) => string

const PATTERNS: Array<{ test: RegExp; format: (match: RegExpMatchArray, t: Translate) => string }> = [
  {
    // "Too many requests. Try again in 900 seconds." (ThrottlerException / RateLimitGuard legado)
    test: /too many requests.*try again in (\d+)\s*seconds?/i,
    format: (match, t) => {
      const seconds = parseInt(match[1], 10)
      const wait = seconds < 60
        ? `${seconds} ${t(seconds === 1 ? 'apiErrors.second' : 'apiErrors.secondsPlural')}`
        : `${Math.ceil(seconds / 60)} ${t(Math.ceil(seconds / 60) === 1 ? 'apiErrors.minute' : 'apiErrors.minutesPlural')}`
      return t('apiErrors.tooManyRequestsWithTime', { wait })
    },
  },
  {
    // "ThrottlerException: Too Many Requests" u otros mensajes genéricos del throttler
    test: /throttlerexception|too many requests/i,
    format: (_match, t) => t('apiErrors.tooManyRequests'),
  },
];

/**
 * Devuelve un mensaje de error legible en el idioma activo a partir de un error de fetch/API.
 * Si el mensaje del backend ya es válido (no coincide con patrones técnicos conocidos),
 * se usa tal cual. De lo contrario, se traduce o se usa el fallback.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiErrorLike
  const raw = e?.data?.message ?? e?.message

  if (!raw) return fallback

  const msg = Array.isArray(raw) ? raw.join('. ') : raw

  const { $i18n } = useNuxtApp()
  const t = $i18n.t as Translate

  for (const { test, format } of PATTERNS) {
    const match = msg.match(test)
    if (match) return format(match, t)
  }

  return msg || fallback
}

/**
 * Extrae los segundos de espera de un error de rate-limit, leyendo el mensaje
 * crudo del backend (siempre en inglés) en lugar del mensaje ya traducido.
 * Devuelve null si el error no es un rate-limit con tiempo de espera.
 */
export function getRateLimitSeconds(err: unknown): number | null {
  const e = err as ApiErrorLike
  const raw = e?.data?.message ?? e?.message
  if (!raw) return null

  const msg = Array.isArray(raw) ? raw.join('. ') : raw
  const match = msg.match(/too many requests.*try again in (\d+)\s*seconds?/i)
  return match ? parseInt(match[1], 10) : null
}
