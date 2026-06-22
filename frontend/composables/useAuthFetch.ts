import { useAuth } from './useAuth'

// Fetch autenticado con reintento automático de 401 vía refresh token.
// Centraliza el patrón repetido en useDashboard/useClienteDashboard para
// evitar que cada composable reimplemente su propio manejo de sesión expirada.
export function useAuthFetch() {
  const { token, refreshTokens } = useAuth()

  async function apiFetch(path: string, options: RequestInit = {}) {
    const config = useRuntimeConfig()
    const base = config.public.apiUrl

    const doRequest = async (tkn: string) =>
      fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tkn}`,
          ...(options.headers ?? {}),
        },
      })

    let res = await doRequest(token.value)
    if (res.status === 401) {
      const ok = await refreshTokens()
      if (!ok) throw new Error('Sesión expirada')
      res = await doRequest(token.value)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `Error ${res.status}`)
    }
    return res.json()
  }

  return { apiFetch }
}
