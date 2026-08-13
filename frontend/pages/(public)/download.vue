<template>
  <div class="max-w-3xl mx-auto space-y-8 pb-16">

    <!-- Hero -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="h-1.5 bg-gradient-to-r from-workplace-red to-red-600" />
      <div class="px-8 py-10 text-center space-y-5">
        <div class="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-workplace-red text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
          <DevicePhoneMobileIcon class="w-3.5 h-3.5" />
          {{ t('download.badge') }}
        </div>
        <h1 class="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          {{ t('download.title') }}
        </h1>
        <p class="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          {{ t('download.subtitle', { appName: t('common.appName') }) }}
        </p>

        <!-- Android: CTA directo -->
        <div v-if="platform === 'android'" class="flex flex-col items-center gap-2 pt-2">
          <a
            :href="apkUrl"
            download
            class="inline-flex items-center justify-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 text-base"
          >
            <ArrowDownTrayIcon class="w-5 h-5" />
            {{ t('download.android.cta') }}
          </a>
          <p class="text-xs text-gray-400">{{ t('download.android.note') }}</p>
        </div>

        <!-- iOS: sin app nativa todavía -->
        <div v-else-if="platform === 'ios'" class="max-w-md mx-auto pt-2">
          <div class="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-left space-y-2">
            <p class="text-sm font-semibold text-blue-900">{{ t('download.ios.title') }}</p>
            <p class="text-sm text-blue-700 leading-relaxed">
              {{ t('download.ios.description', { appName: t('common.appName') }) }}
            </p>
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 mt-1"
            >
              {{ t('download.ios.cta') }}
              <ArrowRightIcon class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </div>

        <!-- Desktop: QR para descargar en el celular -->
        <div v-else class="flex flex-col items-center gap-3 pt-2">
          <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <img
              v-if="qrDataUrl"
              :src="qrDataUrl"
              :alt="t('download.desktop.qrAlt', { appName: t('common.appName') })"
              class="w-40 h-40"
              width="160"
              height="160"
            />
            <div v-else class="w-40 h-40 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <p class="text-sm font-semibold text-gray-700">{{ t('download.desktop.title') }}</p>
          <p class="text-xs text-gray-400 max-w-xs text-center">{{ t('download.desktop.description') }}</p>
          <a
            :href="apkUrl"
            download
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-workplace-red hover:text-red-700 mt-1"
          >
            <ArrowDownTrayIcon class="w-3.5 h-3.5" />
            {{ t('download.android.cta') }}
          </a>
        </div>
      </div>
    </div>

    <!-- Cómo instalar (solo relevante para Android) -->
    <div v-if="platform !== 'ios'" class="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8">
      <h2 class="text-lg font-bold text-gray-900 mb-5">{{ t('download.android.howToInstall') }}</h2>
      <ol class="space-y-4">
        <li v-for="(step, i) in installSteps" :key="i" class="flex items-start gap-3">
          <span class="w-6 h-6 rounded-full bg-red-50 text-workplace-red text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            {{ i + 1 }}
          </span>
          <p class="text-sm text-gray-600 leading-relaxed">{{ step }}</p>
        </li>
      </ol>
    </div>

    <!-- Features -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8">
      <h2 class="text-lg font-bold text-gray-900 mb-5">{{ t('download.features.title') }}</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div v-for="feat in features" :key="feat.label" class="flex items-start gap-3">
          <div :class="['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', feat.bg]">
            <component :is="feat.icon" class="w-4 h-4 text-white" />
          </div>
          <p class="text-sm text-gray-600 leading-relaxed pt-1">{{ feat.label }}</p>
        </div>
      </div>
    </div>

    <div class="text-center">
      <NuxtLink to="/" class="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
        ← {{ t('download.backToSite') }}
      </NuxtLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  WifiIcon,
  BellIcon,
  CameraIcon,
  BoltIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'public' })

const { t } = useI18n()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl as string

const apkUrl = '/downloads/workplace-manager.apk'
const { platform, init } = usePlatformDetect()

useHead(() => ({
  title: t('download.seo.title', { appName: t('common.appName') }),
  meta: [
    { name: 'description', content: t('download.seo.description', { appName: t('common.appName') }) },
  ],
  link: [{ rel: 'canonical', href: `${siteUrl}/download` }],
}))

const installSteps = computed(() => [
  t('download.android.step1'),
  t('download.android.step2'),
  t('download.android.step3'),
  t('download.android.step4'),
])

const features = computed(() => [
  { label: t('download.features.offline'), icon: WifiIcon, bg: 'bg-blue-500' },
  { label: t('download.features.notifications'), icon: BellIcon, bg: 'bg-amber-500' },
  { label: t('download.features.camera'), icon: CameraIcon, bg: 'bg-violet-500' },
  { label: t('download.features.faster'), icon: BoltIcon, bg: 'bg-green-500' },
])

// QR solo se genera en desktop (evita cargar la librería si no hace falta)
const qrDataUrl = ref<string | null>(null)

onMounted(async () => {
  init()
  if (platform.value === 'desktop') {
    const QRCode = (await import('qrcode')).default
    qrDataUrl.value = await QRCode.toDataURL(`${siteUrl}/download`, {
      width: 160,
      margin: 1,
      color: { dark: '#111827', light: '#ffffff' },
    })
  }
})
</script>
