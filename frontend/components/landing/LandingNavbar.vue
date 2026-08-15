<template>
  <nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
      <!-- Logo -->
      <LayoutAppLogo />

      <!-- Desktop nav -->
      <div class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
        <a href="#features" :aria-label="t('landing.nav.featuresAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.features') }}</a>
        <a href="#how" :aria-label="t('landing.nav.howAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.how') }}</a>
        <a href="#testimonials" :aria-label="t('landing.nav.testimonialsAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.testimonials') }}</a>
        <a href="#pricing" :aria-label="t('landing.nav.pricingAria')" class="hover:text-gray-900 transition-colors duration-150">{{ t('landing.nav.pricing') }}</a>
      </div>

      <!-- CTA + Hamburger -->
      <div class="flex items-center gap-2">
        <SharedLanguageSwitcher />
        <NuxtLink
          to="/download"
          :aria-label="t('landing.nav.downloadApp')"
          class="hidden md:flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-workplace-red px-4 py-2 rounded-lg hover:bg-red-50 transition-all duration-150"
        >
          <DevicePhoneMobileIcon class="w-4 h-4" />
          {{ t('landing.nav.downloadApp') }}
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="hidden md:block text-sm font-semibold text-gray-700 hover:text-workplace-red px-4 py-2 rounded-lg hover:bg-red-50 transition-all duration-150"
        >
          {{ t('landing.nav.login') }}
        </NuxtLink>
        <NuxtLink
          to="/register"
          class="hidden md:inline-flex text-sm font-semibold text-white bg-workplace-red hover:bg-red-700 px-4 py-2 rounded-lg shadow-sm transition-all duration-150"
        >
          {{ t('landing.nav.startFree') }}
        </NuxtLink>
        <!-- Mobile hamburger -->
        <button
          type="button"
          class="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-150"
          :aria-label="modelValue ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')"
          :aria-expanded="modelValue"
          @click="$emit('update:modelValue', !modelValue)"
        >
          <XMarkIcon v-if="modelValue" class="w-5 h-5" />
          <Bars3Icon v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Mobile drawer -->
    <Transition name="mobile-menu">
      <div v-if="modelValue" class="md:hidden border-t border-gray-100 bg-white shadow-lg">
        <div class="px-4 py-4 space-y-1">
          <a
            href="#features"
            class="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
            @click="$emit('update:modelValue', false)"
          >{{ t('landing.nav.features') }}</a>
          <a
            href="#how"
            class="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
            @click="$emit('update:modelValue', false)"
          >{{ t('landing.nav.how') }}</a>
          <a
            href="#testimonials"
            class="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
            @click="$emit('update:modelValue', false)"
          >{{ t('landing.nav.testimonials') }}</a>
          <a
            href="#pricing"
            class="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
            @click="$emit('update:modelValue', false)"
          >{{ t('landing.nav.pricing') }}</a>
          <NuxtLink
            to="/download"
            class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
            @click="$emit('update:modelValue', false)"
          >
            <DevicePhoneMobileIcon class="w-4 h-4" />
            {{ t('landing.nav.downloadApp') }}
          </NuxtLink>
        </div>
        <div class="px-4 pb-4 pt-2 border-t border-gray-100 flex flex-col gap-2">
          <NuxtLink
            to="/login"
            class="block text-center text-sm font-semibold text-gray-700 hover:text-workplace-red px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-150"
            @click="$emit('update:modelValue', false)"
          >{{ t('landing.nav.login') }}</NuxtLink>
          <NuxtLink
            to="/register"
            class="block text-center text-sm font-semibold text-white bg-workplace-red hover:bg-red-700 px-4 py-2.5 rounded-lg shadow-sm transition-all duration-150"
            @click="$emit('update:modelValue', false)"
          >{{ t('landing.nav.startFree') }}</NuxtLink>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { XMarkIcon, Bars3Icon, DevicePhoneMobileIcon } from '@heroicons/vue/24/outline'

defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
</script>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  max-height: 0;
}
.mobile-menu-enter-to,
.mobile-menu-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
