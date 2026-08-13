import { useRuntimeConfig } from 'nuxt/app'

/**
 * 🔧 Utilidad centralizada para construir URLs de assets (avatars, uploads, etc.)
 * 
 * El apiUrl incluye `/api` al final, pero los assets se sirven desde la raíz.
 * Esta función remueve `/api` antes de concatenar el path del asset.
 * 
 * @example
 * const { getAssetUrl } = useAssetUrl()
 * const avatarUrl = getAssetUrl(user.avatar) // '/uploads/avatars/xxx.png' → 'http://localhost:3001/uploads/avatars/xxx.png'
 */
export function useAssetUrl() {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  /**
   * Construye la URL completa de un asset
   * @param path - Path relativo del asset (ej: '/uploads/avatars/xxx.png') o URL absoluta
   * @returns URL completa del asset o null si no hay path
   */
  function getAssetUrl(path: string | null | undefined): string | null {
    if (!path) return null
    // Si ya es URL absoluta, devolverla tal cual
    if (path.startsWith('http')) return path
    // Remover /api del apiUrl y concatenar el path
    const baseUrl = apiUrl.replace(/\/api$/, '')
    return `${baseUrl}${path}`
  }

  return {
    getAssetUrl,
    baseUrl: apiUrl.replace(/\/api$/, ''),
  }
}

export default useAssetUrl
