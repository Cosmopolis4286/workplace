<template>
  <!-- Android: descarga directa del APK -->
  <a
    v-if="platform === 'android'"
    :href="apkUrl"
    download
    :class="buttonClass"
  >
    <ArrowDownTrayIcon class="w-4 h-4" />
    {{ t('download.android.cta') }}
  </a>

  <!-- iOS / desktop: lleva a la página de descarga (QR o instrucciones PWA) -->
  <NuxtLink
    v-else
    to="/download"
    :class="buttonClass"
  >
    <DevicePhoneMobileIcon class="w-4 h-4" />
    {{ t('landing.nav.downloadApp') }}
  </NuxtLink>
</template>

<script setup lang="ts">
import { ArrowDownTrayIcon, DevicePhoneMobileIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary'
}>(), {
  variant: 'primary',
})

const { t } = useI18n()
const { platform, init } = usePlatformDetect()
const apkUrl = '/downloads/workplace-manager.apk'

onMounted(init)

const buttonClass = computed(() => {
  const base = 'inline-flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl transition-all duration-150 text-sm'
  return props.variant === 'primary'
    ? `${base} bg-workplace-red hover:bg-red-700 text-white shadow-sm hover:shadow-md`
    : `${base} bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:shadow-sm`
})
</script>
