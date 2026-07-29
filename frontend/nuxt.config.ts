// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

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
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      // country-state-city (dataset completo de países/estados/ciudades del
      // mundo, cargado on-demand vía import() dinámico en useLocationData.ts)
      // pesa ~8.7MB minificado — muy por encima de lo que tiene sentido
      // precachear para offline. maximumFileSizeToCacheInBytes lo excluye del
      // precache manifest sin tocar el runtime caching del resto de la app;
      // el selector de ubicación simplemente requiere red la primera vez que
      // se abre (igual que el resto de la app, que ya depende de la API).
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