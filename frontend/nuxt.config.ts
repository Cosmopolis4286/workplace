// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineNuxtConfig } from 'nuxt/config'

// En desarrollo, la URL del API la manda .env.dev, sin excepciones.
// Los archivos .env nunca pisan variables que ya existen, así que antes
// ganaba cualquier otra fuente:
// - un NUXT_PUBLIC_API_URL en frontend/.env (p. ej. de compilar la APK);
// - una variable API_URL de Windows/la terminal (p. ej. de configurar
//   producción o el runner en la misma PC).
// En los dos casos el frontend local llamaba al API de producción. Por eso se
// lee API_URL directamente del archivo. En el contenedor frontend-dev, que no
// tiene ../.env.dev, se usa el API_URL que le pasa el compose (env_file).
// En build/generate no se toca nada: ahí NUXT_PUBLIC_API_URL sigue siendo la
// forma de elegir el API.
function devApiUrl(): string | undefined {
  const file = resolve(process.cwd(), '../.env.dev')
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*API_URL\s*=\s*(.*?)\s*$/)
      const value = m?.[1]?.replace(/^(['"])(.*)\1$/, '$2')
      if (value) return value
    }
  }
  return process.env.API_URL
}

if (process.env.NODE_ENV !== 'production') {
  const apiUrl = devApiUrl()
  if (apiUrl) {
    process.env.API_URL = apiUrl
    process.env.NUXT_PUBLIC_API_URL = apiUrl
  }
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