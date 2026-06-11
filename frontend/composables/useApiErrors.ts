/**
 * Traduce/normaliza mensajes de error de la API a español amigable.
 * Sirve de red de seguridad ante mensajes técnicos o en inglés
 * que puedan escapar del backend (ej. límites de tasa, excepciones genéricas).
 */

interface ApiErrorLike {
  data?: { message?: string | string[] }
  message?: string
}

const PATTERNS: Array<{ test: RegExp; format: (match: RegExpMatchArray) => string }> = [
  {
    // "Too many requests. Try again in 900 seconds." (ThrottlerException / RateLimitGuard legado)
    test: /too many requests.*try again in (\d+)\s*seconds?/i,
    format: (match) => {
      const seconds = parseInt(match[1], 10)
      const wait = seconds < 60
        ? `${seconds} segundo${seconds === 1 ? '' : 's'}`
        : `${Math.ceil(seconds / 60)} minuto${Math.ceil(seconds / 60) === 1 ? '' : 's'}`
      return `Demasiadas solicitudes. Intenta de nuevo en ${wait}.`
    },
  },
  {
    // "ThrottlerException: Too Many Requests" u otros mensajes genéricos del throttler
    test: /throttlerexception|too many requests/i,
    format: () => 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
  },
];

/**
 * Devuelve un mensaje de error legible en español a partir de un error de fetch/API.
 * Si el mensaje del backend ya es válido (no coincide con patrones técnicos conocidos),
 * se usa tal cual. De lo contrario, se traduce o se usa el fallback.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiErrorLike
  const raw = e?.data?.message ?? e?.message

  if (!raw) return fallback

  const msg = Array.isArray(raw) ? raw.join('. ') : raw

  for (const { test, format } of PATTERNS) {
    const match = msg.match(test)
    if (match) return format(match)
  }

  return msg || fallback
}
