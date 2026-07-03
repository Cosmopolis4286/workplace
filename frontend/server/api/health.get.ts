export default defineEventHandler(async (event) => {
  try {
    const backendUrl = process.env.API_URL || 'http://localhost:3001/api'

    const start = Date.now()
    const backendHealth = await $fetch<{ status: string }>(`${backendUrl}/health`, {
      timeout: 5000,
    }).catch(() => null)
    const responseTime = Date.now() - start

    const backendUp = backendHealth?.status === 'ok'

    setResponseStatus(event, backendUp ? 200 : 503)

    return {
      status: backendUp ? 'ok' : 'down',
      timestamp: new Date().toISOString(),
      backend: {
        connected: backendUp,
        response_time: responseTime,
      },
    }
  } catch {
    setResponseStatus(event, 503)
    return { status: 'down', timestamp: new Date().toISOString() }
  }
})
