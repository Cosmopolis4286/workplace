// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',

  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@pinia/nuxt',
  ],

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
    '~/plugins/chart.client.ts',
    '~/plugins/auth.client.ts',
  ],

  ssr: false,

  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL || '/api',
      environment: process.env.APP_ENV || 'development',
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
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
  }
})