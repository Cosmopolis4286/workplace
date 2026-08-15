<template>
  <div class="min-h-screen flex">
    <AuthMarketingPanel :variant="panelVariant" />

    <!-- Right Panel: Form -->
    <div class="flex-1 flex flex-col min-h-screen bg-gray-50">
      <!-- Top bar -->
      <div class="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-100 bg-white">
        <!-- Mobile logo -->
        <div class="lg:hidden">
          <AppLogo size="sm" />
        </div>
        <div class="hidden lg:block"></div>

        <div class="flex items-center gap-4">
          <!-- Nav links slot -->
          <slot name="header-action" />
          <LanguageSwitcher />
        </div>
      </div>

      <!-- Main form area -->
      <div class="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-10">
        <div class="w-full max-w-md space-y-8">
          <!-- Page heading -->
          <div class="space-y-2">
            <h2 class="text-3xl font-black text-gray-900 tracking-tight">{{ title }}</h2>
            <p v-if="description" class="text-gray-500 text-base">{{ description }}</p>
          </div>

          <!-- Form card -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <slot />
          </div>

          <!-- Footer links -->
          <div class="text-center">
            <slot name="footer" />
          </div>
        </div>
      </div>

      <!-- Bottom footer -->
      <div class="px-6 py-5 border-t border-gray-100 bg-white">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 max-w-md mx-auto w-full">
          <p>{{ t('auth.layout.copyright', { year: currentYear, appName: t('common.appName') }) }}</p>
          <div class="flex items-center space-x-4">
            <NuxtLink to="/privacy" class="hover:text-gray-600 transition-colors duration-150">{{ t('auth.layout.privacy') }}</NuxtLink>
            <NuxtLink to="/terms" class="hover:text-gray-600 transition-colors duration-150">{{ t('auth.layout.terms') }}</NuxtLink>
            <NuxtLink to="/support" class="hover:text-gray-600 transition-colors duration-150">{{ t('auth.layout.support') }}</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AuthMarketingPanel from '~/components/auth/AuthMarketingPanel.vue'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  // Qué copy/pasos mostrar en el panel lateral — cada página que usa este
  // layout debe declararlo a propósito (ver AuthMarketingPanel.vue).
  panelVariant: {
    type: String as () => 'login' | 'register' | 'verify-email' | 'recover-password' | 'reset-password' | 'two-factor',
    default: 'login',
  },
})

const { t } = useI18n({ useScope: 'global' })

// SSR-safe year
const currentYear = useState('currentYear', () => new Date().getFullYear())
</script>
