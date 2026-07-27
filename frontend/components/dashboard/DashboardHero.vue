<template>
  <div class="relative overflow-hidden rounded-2xl mb-8" :class="gradientClass">
    <div class="absolute inset-0 bg-black/[0.06]"></div>
    <div class="relative px-6 sm:px-8 py-6 sm:py-7 flex items-center justify-between gap-6">
      <div class="flex items-center gap-4 min-w-0">
        <div class="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/15 rounded-xl shrink-0">
          <component :is="heroIcon" class="h-6 w-6 sm:h-7 sm:w-7 text-white" />
        </div>
        <div class="min-w-0 text-white">
          <div class="flex items-center gap-2 mb-1">
            <h1 class="text-xl sm:text-2xl font-bold leading-tight truncate">{{ config.title }}</h1>
            <span class="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-medium uppercase tracking-wide">
              {{ roleLabel }}
            </span>
          </div>
          <p class="text-sm text-white/75 truncate">{{ config.subtitle }}</p>
        </div>
      </div>

      <div class="hidden md:flex items-center gap-5 shrink-0">
        <div class="flex items-center gap-1.5 text-white/75 text-xs">
          <span class="h-1.5 w-1.5 bg-emerald-300 rounded-full"></span>
          Sistema activo
        </div>
        <div class="w-px h-8 bg-white/15"></div>

        <!-- Tasa de cambio en vivo -->
        <NuxtLink
          v-if="defaultRate"
          to="/tasas-cambio"
          class="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1.5 transition-colors duration-200"
          :title="`Actualizado ${lastUpdatedLabel}`"
        >
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
          </span>
          <div class="text-right leading-tight">
            <div class="text-sm font-semibold text-white tabular-nums">
              1 USD = {{ defaultRate.rateToUsd.toLocaleString('es-VE', { maximumFractionDigits: 2 }) }} {{ defaultRate.code }}
            </div>
            <div class="text-[11px] text-white/60">{{ defaultRate.source || 'Tasa' }} · {{ lastUpdatedLabel }}</div>
          </div>
        </NuxtLink>

        <div class="w-px h-8 bg-white/15"></div>
        <div class="text-right">
          <div class="text-lg font-semibold text-white leading-tight tabular-nums">{{ currentTime }}</div>
          <div class="text-[11px] text-white/60 capitalize">{{ formattedDate }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChartBarIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  UserIcon,
  WrenchIcon,
} from '@heroicons/vue/24/outline'
import type { HeroConfig } from '~/config/dashboard.config'
import { useExchangeRates } from '~/composables/useExchangeRates'

interface Props {
  config: HeroConfig
}

const props = defineProps<Props>()

// ── Tasa de cambio en vivo ──────────────────────────────────────────────────
const { defaultRate, fetchRates } = useExchangeRates()
let ratesTimer: ReturnType<typeof setInterval>
const RATES_POLL_MS = 60_000

const lastUpdatedLabel = computed(() => {
  if (!defaultRate.value) return ''
  const diffMin = Math.floor((Date.now() - new Date(defaultRate.value.updatedAt).getTime()) / 60_000)
  if (diffMin < 1) return 'justo ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  return `hace ${diffH} h`
})

const gradientMap: Record<string, string> = {
  'from-purple-600 via-purple-500 to-indigo-600': 'bg-gradient-to-r from-purple-600 to-indigo-600',
  'from-workplace-red via-red-500 to-red-600': 'bg-gradient-to-r from-red-600 to-rose-600',
  'from-teal-500 via-teal-600 to-emerald-600': 'bg-gradient-to-r from-teal-600 to-emerald-600',
  'from-blue-500 via-blue-600 to-indigo-600': 'bg-gradient-to-r from-blue-600 to-indigo-600',
}

const gradientClass = computed(() => gradientMap[props.config.gradient] || gradientMap['from-workplace-red via-red-500 to-red-600'])

const iconMap: Record<string, any> = {
  ShieldCheckIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  UserIcon,
  ChartBarIcon,
  WrenchIcon,
}

const heroIcon = computed(() => iconMap[props.config.icon] || ChartBarIcon)

const roleLabels: Record<string, string> = {
  ShieldCheckIcon: 'Superadmin',
  BuildingOfficeIcon: 'Admin',
  BuildingStorefrontIcon: 'Comercio',
  TruckIcon: 'Freelancer',
  WrenchIcon: 'Freelancer',
  UserIcon: 'Cliente',
}

const roleLabel = computed(() => roleLabels[props.config.icon] ?? '')

const currentTime = ref('')
let clockTimer: ReturnType<typeof setInterval>

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
})

onMounted(() => {
  const tick = () => {
    currentTime.value = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  tick()
  clockTimer = setInterval(tick, 1000)

  fetchRates(false, true)
  ratesTimer = setInterval(() => fetchRates(false, true), RATES_POLL_MS)
})

onUnmounted(() => {
  clearInterval(clockTimer)
  clearInterval(ratesTimer)
})
</script>
