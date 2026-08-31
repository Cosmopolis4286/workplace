// types/nuxt.d.ts
import 'nuxt/config'

declare module 'nuxt/config' {
  interface NuxtConfig {
    tailwindcss?: {
      cssPath?: string
      configPath?: string
      exposeConfig?: boolean
      viewer?: boolean
    }
  }
}
