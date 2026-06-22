/**
 * Composable dedicado para manejo de llamadas API
 * Centraliza la lógica de autenticación, retry y errores
 */

export function useApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiUrl as string
  const { getHeaders, refreshAccessToken } = useAuth()

  /**
   * Función principal para llamadas API
   * Maneja automáticamente:
   * - Headers de autenticación
   * - Refresh de token en 401
   * - Retry de requests fallidos
   * - Parseo de errores
   */
  async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> ?? {}),
    }

    const res = await fetch(`${base}${url}`, { ...options, headers, credentials: 'include' })

    // Token expirado, intentar refresh
    if (res.status === 401) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        const retryHeaders = {
          'Content-Type': 'application/json',
          ...getHeaders(),
        }
        const retry = await fetch(`${base}${url}`, { ...options, headers: retryHeaders, credentials: 'include' })
        if (!retry.ok) {
          const body = await retry.json().catch(() => ({}))
          throw new Error(body.message ?? `Error ${retry.status}`)
        }
        return retry.json()
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `Error ${res.status}`)
    }

    return res.json()
  }

  /**
   * GET request simplificado
   */
  async function get<T>(url: string, options: RequestInit = {}): Promise<T> {
    return apiFetch<T>(url, { ...options, method: 'GET' })
  }

  /**
   * POST request simplificado
   */
  async function post<T>(url: string, body: any): Promise<T> {
    return apiFetch<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * PUT request simplificado
   */
  async function put<T>(url: string, body: any): Promise<T> {
    return apiFetch<T>(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /**
   * PATCH request simplificado
   */
  async function patch<T>(url: string, body: any): Promise<T> {
    return apiFetch<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
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
