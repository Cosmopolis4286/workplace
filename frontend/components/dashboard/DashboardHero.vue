<template>
  <div class="relative overflow-hidden rounded-3xl mb-8 shadow-2xl" :class="gradientClass">
    <div class="absolute inset-0 bg-black/10"></div>
    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-white/10"></div>
    <div class="relative px-8 py-12">
      <div class="flex items-center justify-between">
        <div class="text-white">
          <div class="flex items-center space-x-4 mb-4">
            <div class="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <component :is="heroIcon" class="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 class="text-4xl sm:text-5xl font-black mb-2">{{ config.title }}</h1>
              <p class="text-xl font-medium opacity-90">{{ config.subtitle }}</p>
              <div class="flex items-center mt-2 space-x-4">
                <div class="flex items-center opacity-80">
                  <div class="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <span class="text-sm font-medium">Sistema activo</span>
                </div>
                <div class="opacity-80 text-sm">
                  {{ formattedDate }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="hidden lg:block">
          <div class="relative">
            <div class="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
            <div class="relative bg-white/10 backdrop-blur-sm rounded-full p-8">
              <div class="text-center text-white">
                <div class="text-3xl font-black">{{ currentTime }}</div>
                <div class="text-sm opacity-80">Hora actual</div>
              </div>
            </div>
          </div>
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
} from '@heroicons/vue/24/outline'
import type { HeroConfig } from '~/config/dashboard.config'

interface Props {
  config: HeroConfig
}

const props = defineProps<Props>()

const gradientMap: Record<string, string> = {
  'from-purple-600 via-purple-500 to-indigo-600': 'bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600',
  'from-workplace-red via-red-500 to-red-600': 'bg-gradient-to-br from-workplace-red via-red-500 to-red-600',
  'from-teal-500 via-teal-600 to-emerald-600': 'bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600',
  'from-blue-500 via-blue-600 to-indigo-600': 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600',
}

const gradientClass = computed(() => gradientMap[props.config.gradient] || gradientMap['from-workplace-red via-red-500 to-red-600'])

const iconMap: Record<string, any> = {
  ShieldCheckIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  UserIcon,
  ChartBarIcon,
}

const heroIcon = computed(() => iconMap[props.config.icon] || ChartBarIcon)

const currentTime = ref('')
let clockTimer: ReturnType<typeof setInterval>

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
})

onUnmounted(() => clearInterval(clockTimer))
</script>
