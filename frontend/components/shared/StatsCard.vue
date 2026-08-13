<template>
  <div class="card p-6">
    <div class="flex items-center justify-between">
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-500">{{ title }}</p>
        <p class="text-3xl font-bold text-gray-900 truncate">{{ value }}</p>
        <div v-if="change !== undefined" class="flex items-center mt-2">
          <component :is="changeIcon" class="h-4 w-4 mr-1" :class="changeColor" />
          <span class="text-sm" :class="changeColor">
            {{ changeLabel }}
            <span v-if="period" class="text-gray-400 ml-1">{{ period }}</span>
          </span>
        </div>
      </div>
      <div class="p-3 rounded-full flex-shrink-0" :class="iconBgClass">
        <component :is="icon" class="h-8 w-8" :class="iconColorClass" />
      </div>
    </div>

    <div v-if="progress !== undefined" class="mt-4 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
      <div class="h-full rounded-full transition-all duration-500" :class="progressBarClass" :style="{ width: `${Math.min(Math.max(progress, 0), 100)}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(defineProps<{
  title: string
  value: string
  icon: object | Function
  /** Variación numérica (%) opcional — omitir oculta la fila de cambio. */
  change?: number | null
  /** Texto a mostrar junto al ícono de cambio; si no se pasa, se deriva de `change` (ej. "+12%"). */
  changeLabel?: string
  /** Texto pequeño tras el cambio, ej. "vs mes anterior". */
  period?: string
  /** Color de acento del ícono: primary(rojo) | secondary(naranja) | success(verde) | warning(amarillo) | info(azul) | purple */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'purple'
  /** Progreso 0-100 opcional — omitir oculta la barra. */
  progress?: number
}>(), {
  variant: 'primary',
})

const changeIcon = computed(() => {
  if (props.change === null || props.change === undefined) return MinusIcon
  return props.change >= 0 ? ArrowUpIcon : ArrowDownIcon
})

const changeColor = computed(() => {
  if (props.change === null || props.change === undefined) return 'text-gray-400'
  return props.change >= 0 ? 'text-green-600' : 'text-red-600'
})

const changeLabelComputed = computed(() => {
  if (props.changeLabel) return props.changeLabel
  if (props.change === null || props.change === undefined) return '—'
  return `${props.change >= 0 ? '+' : ''}${props.change}%`
})
const changeLabel = changeLabelComputed

const VARIANT_CLASSES: Record<string, { bg: string; icon: string; bar: string }> = {
  primary:   { bg: 'bg-red-100',    icon: 'text-red-600',    bar: 'bg-red-500' },
  secondary: { bg: 'bg-orange-100', icon: 'text-orange-600', bar: 'bg-orange-500' },
  success:   { bg: 'bg-green-100',  icon: 'text-green-600',  bar: 'bg-green-500' },
  warning:   { bg: 'bg-yellow-100', icon: 'text-yellow-600', bar: 'bg-yellow-500' },
  info:      { bg: 'bg-blue-100',   icon: 'text-blue-600',   bar: 'bg-blue-500' },
  purple:    { bg: 'bg-purple-100', icon: 'text-purple-600', bar: 'bg-purple-500' },
}

const iconBgClass = computed(() => VARIANT_CLASSES[props.variant].bg)
const iconColorClass = computed(() => VARIANT_CLASSES[props.variant].icon)
const progressBarClass = computed(() => VARIANT_CLASSES[props.variant].bar)
</script>
