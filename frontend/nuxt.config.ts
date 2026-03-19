// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },
  devtools: { enabled: false },
  modules: [
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
  ],
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    viewer: true,
  },
  css: ['~/assets/css/main.css', '~/assets/css/gradients.css'],
  plugins: [
    '~/plugins/chart.client.ts',
    '~/plugins/auth.client.ts',
  ],
  ssr: false,
  router: {
    middleware: ['auth', 'modules'],
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001',
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
    },
  },
  build: {
    transpile: ['#app-manifest']
  },
  nitro: {
    preset: 'node-server',
    assetsPrefix: '/_nuxt/',
    minify: true
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  }
})