export type DownloadPlatform = 'android' | 'ios' | 'desktop'

/**
 * Detecta la plataforma del visitante a partir del user agent (no de Capacitor.getPlatform(),
 * que solo aplica dentro del propio APK). Se usa en la landing/página de descarga para decidir
 * qué CTA mostrar a alguien que todavía no tiene la app instalada.
 */
export function usePlatformDetect() {
  const platform = useState<DownloadPlatform>('download-platform', () => 'desktop')

  function detect(): DownloadPlatform {
    if (import.meta.server) return 'desktop'
    const ua = window.navigator.userAgent || ''
    if (/android/i.test(ua)) return 'android'
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
    // iPadOS 13+ reporta un UA de desktop; distinguirlo requiere maxTouchPoints
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios'
    return 'desktop'
  }

  function init() {
    platform.value = detect()
  }

  return { platform, init }
}
