export default defineNuxtPlugin(async (nuxtApp) => {
  const { sentryDsn, environment } = useRuntimeConfig().public

  // Sin DSN configurado, Sentry permanece desactivado (no-op) y no se
  // incluye en el chunk de entrada (import dinámico)
  if (!sentryDsn) {
    return
  }

  const [Sentry, SentryVue] = await Promise.all([
    import('@sentry/capacitor'),
    import('@sentry/vue'),
  ])

  Sentry.init(
    {
      dsn: sentryDsn,
      environment,
      tracesSampleRate: 0.1,
      siblingOptions: {
        vueOptions: {
          app: nuxtApp.vueApp,
          attachProps: true,
          attachErrorHandler: true,
        },
      },
    },
    SentryVue.init,
  )
})
