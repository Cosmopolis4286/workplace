// Health endpoint real para producción
export default defineEventHandler(async (event) => {
  try {
    // Verificar conexión a backend
    const backendUrl = process.env.BACKEND_API_URL || '/api'
    
    const backendHealth = await $fetch(`${backendUrl}/health`, {
      timeout: 5000
    }).catch(() => null)

    // Verificar variables de entorno críticas
    const envChecks = {
      BACKEND_API_URL: !!process.env.BACKEND_API_URL,
      NITRO_HOST: !!process.env.NITRO_HOST,
      NITRO_PORT: !!process.env.NITRO_PORT
    }

    const allEnvValid = Object.values(envChecks).every(Boolean)

    // Estado del frontend
    const frontendStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.ENVIRONMENT || 'development',
      backend: {
        connected: !!backendHealth,
        status: backendHealth?.status || 'unreachable',
        response_time: backendHealth?.response_time || null
      },
      environment_checks: envChecks,
      all_checks_passed: allEnvValid && !!backendHealth
    }

    // Responder con estado apropiado
    setResponseStatus(event, frontendStatus.all_checks_passed ? 200 : 503)
    
    return frontendStatus
  } catch (error) {
    setResponseStatus(event, 503)
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      all_checks_passed: false
    }
  }
})
