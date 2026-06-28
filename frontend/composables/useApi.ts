/**
 * Composable dedicado para manejo de llamadas API
 * Centraliza la lógica de autenticación, retry y errores
 */

// Error con el status HTTP adjunto, para que el llamador pueda distinguir
// "sin sesión válida" (401) de otros fallos sin parsear el mensaje.
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export function useApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiUrl as string
  const { getHeaders, refreshAccessToken, clearSession } = useAuth()
  const router = useRouter()

  // FormData fija su propio Content-Type con boundary; forzar 'application/json'
  // rompería el multipart, así que solo se agrega para bodies JSON.
  function buildHeaders(options: RequestInit, isFormData: boolean): Record<string, string> {
    return {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...getHeaders(),
      ...(options.headers as Record<string, string> ?? {}),
    }
  }

  /**
   * Función principal para llamadas API
   * Maneja automáticamente:
   * - Headers de autenticación
   * - Refresh de token en 401
   * - Retry de requests fallidos
   * - Parseo de errores
   *
   * Por defecto parsea la respuesta como JSON; pasar `parseAs: 'blob'` para
   * descargas binarias (ej. imágenes privadas servidas tras auth).
   */
  async function apiFetch<T>(url: string, options: RequestInit & { parseAs?: 'json' | 'blob' } = {}): Promise<T> {
    const { parseAs = 'json', ...fetchOptions } = options
    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData
    const headers = buildHeaders(fetchOptions, isFormData)

    const res = await fetch(`${base}${url}`, { ...fetchOptions, headers, credentials: 'include' })

    // Token expirado, intentar refresh
    if (res.status === 401) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        const retryHeaders = buildHeaders(fetchOptions, isFormData)
        const retry = await fetch(`${base}${url}`, { ...fetchOptions, headers: retryHeaders, credentials: 'include' })
        if (!retry.ok) {
          const body = await retry.json().catch(() => ({}))
          throw new ApiError(body.message ?? `Error ${retry.status}`, retry.status)
        }
        return (parseAs === 'blob' ? retry.blob() : retry.json()) as Promise<T>
      }
      // Refresh falló: no hay sesión válida, no tiene sentido reintentar.
      throw new ApiError('No autorizado', 401)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const message = body.message ?? `Error ${res.status}`

      // El JWT sigue siendo válido pero la sesión en Redis expiró por
      // inactividad (30 min, ver jwt.strategy.ts) — el backend devuelve 403
      // con este mensaje específico, no 401, así que un refresh de token no
      // lo resuelve (el problema es la sesión, no el JWT). Cualquier otro 403
      // es una regla de negocio (sin permiso para ESA acción puntual) y no
      // debe forzar logout.
      if (res.status === 403 && typeof message === 'string' && message.includes('inactividad')) {
        clearSession()
        router.push('/login')
      }

      throw new ApiError(message, res.status)
    }

    return (parseAs === 'blob' ? res.blob() : res.json()) as Promise<T>
  }

  /**
   * GET request simplificado
   */
  async function get<T>(url: string, options: RequestInit & { parseAs?: 'json' | 'blob' } = {}): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'GET' })
  }

  /**
   * POST request simplificado. Si `body` es FormData se envía tal cual
   * (multipart); cualquier otro valor se serializa como JSON.
   */
  async function post<T>(url: string, body: any): Promise<T> {
    return apiFetch<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    })
  }

  /**
   * PUT request simplificado
   */
  async function put<T>(url: string, body: any): Promise<T> {
    return apiFetch<T>(url, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    })
  }

  /**
   * PATCH request simplificado
   */
  async function patch<T>(url: string, body: any): Promise<T> {
    return apiFetch<T>(url, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    })
  }

  /**
   * DELETE request simplificado
   */
  async function del<T>(url: string): Promise<T> {
    return apiFetch<T>(url, { method: 'DELETE' })
  }

  return {
    apiFetch,
    get,
    post,
    put,
    patch,
    del,
  }
}
