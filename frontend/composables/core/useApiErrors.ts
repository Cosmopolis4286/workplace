/**
 * Traduce/normaliza mensajes de error de la API al idioma activo.
 * Sirve de red de seguridad ante mensajes técnicos o en inglés
 * que puedan escapar del backend (ej. límites de tasa, excepciones genéricas).
 */

interface ApiErrorLike {
  data?: { message?: string | string[]; errorCode?: string; retryAfterSeconds?: number }
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
 * Código de error machine-readable expuesto por el backend (ver
 * AllExceptionsFilter, que propaga cualquier campo extra del body de la
 * excepción). Preferir esto sobre inspeccionar `message`, que se traduce y
 * puede cambiar de copy/idioma sin previo aviso.
 */
export function getApiErrorCode(err: unknown): string | null {
  const e = err as ApiErrorLike
  return e?.data?.errorCode ?? null
}

/**
 * Extrae los segundos de espera de un error de rate-limit. Lee el campo
 * estructurado `retryAfterSeconds` que exponen SpanishThrottlerGuard y
 * RateLimitGuard — antes se parseaba con regex el mensaje crudo en inglés
 * ("Too many requests... Try again in N seconds"), lo que se rompía en
 * silencio si el backend cambiaba el formato o el idioma del mensaje.
 * Devuelve null si el error no es un rate-limit con tiempo de espera.
 */
export function getRateLimitSeconds(err: unknown): number | null {
  const e = err as ApiErrorLike
  return typeof e?.data?.retryAfterSeconds === 'number' ? e.data.retryAfterSeconds : null
}

export type ApiErrorKind = 'offline' | 'forbidden' | 'notFound' | 'server' | 'unknown'

/**
 * Categoriza un error de fetch/API para que la UI pueda mostrar un mensaje y
 * una acción distintos por caso (ej. "reintentar" solo tiene sentido para
 * offline/server, no para forbidden). `useApi.ts` usa `fetch()` nativo: una
 * falla de red real (sin conexión, DNS, CORS bloqueado) nunca llega a
 * `res.status` — el navegador lanza un TypeError plano ("Failed to fetch")
 * ANTES de que exista una respuesta HTTP, así que se distingue por ausencia
 * de `status` (ApiError siempre lo trae) más el nombre del error nativo.
 */
export function getApiErrorKind(err: unknown): ApiErrorKind {
  const e = err as { status?: number; name?: string; message?: string }

  if (typeof e?.status === 'number') {
    if (e.status === 403) return 'forbidden'
    if (e.status === 404) return 'notFound'
    if (e.status >= 500) return 'server'
    return 'unknown'
  }

  // Sin `status` → nunca llegó a tener una respuesta HTTP real.
  if (e?.name === 'TypeError' || /failed to fetch|network/i.test(e?.message ?? '')) {
    return 'offline'
  }

  return 'unknown'
}
