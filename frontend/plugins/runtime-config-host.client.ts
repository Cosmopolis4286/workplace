/**
 * Si la app se abre desde otro host (LAN/móvil, p.ej. http://192.168.x.x:3000)
 * pero NUXT_PUBLIC_API_URL apunta a "http://localhost:3001/api", ese hostname
 * resuelve al propio dispositivo cliente y todas las peticiones al backend
 * fallan ("Failed to fetch"). Reescribimos el host de apiUrl para que
 * coincida con el host real desde el que se cargó la página.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const configured = config.public.apiUrl as string

  try {
    const url = new URL(configured, window.location.origin)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = window.location.hostname
      config.public.apiUrl = url.toString().replace(/\/$/, '')
    }
  } catch {
    // apiUrl es una ruta relativa (p.ej. "/api"): ya resuelve contra el host actual
  }
})
