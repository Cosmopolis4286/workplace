/**
 * Si la app se abre desde otro host (LAN/móvil, p.ej. http://192.168.x.x:3000)
 * pero NUXT_PUBLIC_API_URL apunta a "http://localhost:3001/api", ese hostname
 * resuelve al propio dispositivo cliente y todas las peticiones al backend
 * fallan ("Failed to fetch"). Reescribimos el host de apiUrl para que
 * coincida con el host real desde el que se cargó la página.
 */
const isLocalHost = (host: string) =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const configured = config.public.apiUrl as string

  try {
    const url = new URL(configured, window.location.origin)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = window.location.hostname
      config.public.apiUrl = url.toString().replace(/\/$/, '')
    }

    // En desarrollo local, un API remoto casi siempre es un error de
    // configuración (p. ej. NUXT_PUBLIC_API_URL de producción en
    // frontend/.env, o el puerto 3000 lo sirve otro servidor). Se avisa en la
    // consola para no perder tiempo con errores de red que parecen del código.
    if (
      import.meta.dev &&
      isLocalHost(window.location.hostname) &&
      !isLocalHost(url.hostname)
    ) {
      console.warn(
        `[API] Estás en desarrollo local pero el API apunta a ${url.origin}.\n` +
          'Revisa: NUXT_PUBLIC_API_URL en frontend/.env o en la terminal, ' +
          'API_URL en .env.dev, y que http://localhost:3000 sea tu "pnpm dev" ' +
          '(no un contenedor como frontend-dev).'
      )
    }
  } catch {
    // apiUrl es una ruta relativa (p.ej. "/api"): ya resuelve contra el host actual
  }
})
