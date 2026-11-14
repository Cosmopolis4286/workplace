// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

// En desarrollo manda API_URL de .env.dev (`pnpm dev` carga ese archivo).
// Nuxt también lee frontend/.env, y un NUXT_PUBLIC_API_URL ahí (p. ej. de
// compilar la APK contra producción) pisaba en tiempo de ejecución la URL de
// .env.dev: el frontend local llamaba al API de producción. Fijarlo aquí, antes
// de que se lea frontend/.env, hace que .env.dev gane (dotenv no pisa
// variables ya definidas). En build/generate no se toca: ahí
// NUXT_PUBLIC_API_URL sigue siendo la forma de elegir el API.
if (process.env.NODE_ENV !== 'production' && process.env.API_URL) {
  process.env.NUXT_PUBLIC_API_URL = process.env.API_URL
}

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',

  app: {
    head: {
      htmlAttrs: { class: 'scroll-smooth' },
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  devtools: { enabled: true },

  imports: {
    dirs: ['composables/**'],
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  modules: [
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    'vue-sonner/nuxt',
  ],

  i18n: {
    locales: [
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'es',
    strategy: 'no_prefix',
    bundle: {
      optimizeTranslationDirective: false,
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    viewer: true,
  },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/gradients.css'
  ],

  plugins: [
    '~/plugins/runtime-config-host.client.ts',
    '~/plugins/color-mode.client.ts',
    '~/plugins/chart.client.ts',
    '~/plugins/auth.client.ts',
  ],

  ssr: false,

  experimental: {
    appManifest: false,
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL || '/api',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://workplace-manager.app',
      environment: process.env.APP_ENV || 'production',
      useDemoCredentials: process.env.USE_DEMO === 'true',
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    // country-state-city (dataset completo de países/estados/ciudades del
    // mundo, cargado on-demand vía import() dinámico en useLocationData.ts)
    // genera un chunk de ~8.7MB minificado que excede maximumFileSizeToCacheInBytes
    // — sin este flag, vite-plugin-pwa aborta el build entero por ese único
    // warning (ver logWorkboxResult) en vez de solo excluir el archivo del
    // precache. El selector de ubicación requiere red la primera vez que se
    // abre sin conexión, igual que el resto de la app.
    showMaximumFileSizeToCacheInBytesWarning: true,
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
    },
    client: {
      installPrompt: true
    },
    manifest: {
      name: 'WorkPlace Manager',
      short_name: 'WorkPlace',
      description: 'Gestor de lugar de trabajo',
      theme_color: '#3b82f6',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: 'icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  }
})