/**
 * Plugin de servidor para inyectar variables de entorno del contenedor
 * Leer USE_DEMO del .env del servidor en runtime
 */
export default defineNuxtPlugin(() => {
  // Leer del entorno del contenedor (process.env del servidor)
  const useDemoCredentials = process.env.USE_DEMO === 'true'
  
  // Obtener runtimeConfig para modificarlo
  const config = useRuntimeConfig()
  
  // Sobrescribir el valor de build-time con el valor de runtime
  config.public.useDemoCredentials = useDemoCredentials
  
  // Log para debugging (solo en servidor)
  console.log(`[RuntimeConfig] USE_DEMO=${useDemoCredentials}`)
})
