// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'
import { loadFrontendConfig } from './config/env'

// Configuración: una sola fuente (config/env.ts). En desarrollo manda
// ../.env.dev por encima de Windows, la terminal y frontend/.env.
const publicRuntimeConfig = loadFrontendConfig()

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
  // Pantalla de carga inicial (antes del JS), mismo diseño que PageLoader.vue.
  spaLoadingTemplate: 'spa-loading-template.html',

  experimental: {
    appManifest: false,
  },

  runtimeConfig: {
    public: publicRuntimeConfig,
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
    // Avisa (sin abortar el build) si algún archivo supera el límite de
    // precache; antes lo superaba country-state-city (~8,7 MB), ya eliminado.
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