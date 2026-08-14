<template>
  <div>
    <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Estado del proceso</p>
    <div class="flex items-start">
      <template v-for="(step, i) in TIMELINE" :key="step.status">
        <div class="flex flex-col items-center flex-1 min-w-0">
          <div
            class="h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all"
            :class="timelineClass(step.status)"
          >
            <component :is="step.icon" class="h-3.5 w-3.5" />
          </div>
          <span
            class="text-xs mt-1 text-center leading-tight"
            :class="isReached(step.status) ? 'text-gray-900 font-medium' : 'text-gray-400'"
          >
            {{ step.label }}
          </span>
          <span
            v-if="stepTimestamp(step.status)"
            class="text-[10px] text-center leading-tight mt-0.5 px-1"
            :class="status === step.status ? 'text-red-500 font-medium' : 'text-gray-400'"
            :title="formatDateTime(stepTimestamp(step.status)!)"
          >
            {{ timeAgo(stepTimestamp(step.status)!) }}
          </span>
          <span v-else class="text-[10px] text-center leading-tight mt-0.5 px-1 text-gray-300">—</span>
        </div>
        <div
          v-if="i < TIMELINE.length - 1"
          class="h-0.5 flex-1 mt-3.5 transition-colors"
          :class="isReached(TIMELINE[i+1].status) ? 'bg-red-400' : 'bg-gray-200'"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClockIcon, EyeIcon, PhoneArrowUpRightIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  status: string
  createdAt: string
  statusUpdatedAt?: string
  formatDateTime: (d: string) => string
  timeAgo: (d: string) => string
}>()

const TIMELINE = [
  { status: 'PENDING',  label: 'Pendiente',  icon: ClockIcon },
  { status: 'SEEN',      label: 'Visto',       icon: EyeIcon },
  { status: 'CONTACTED', label: 'Contactado',  icon: PhoneArrowUpRightIcon },
  { status: 'CLOSED',    label: 'Cerrado',     icon: CheckCircleIcon },
]
const STATUS_ORDER = ['PENDING', 'SEEN', 'CONTACTED', 'CLOSED']

function isReached(status: string) {
  return STATUS_ORDER.indexOf(status) <= STATUS_ORDER.indexOf(props.status)
}

function timelineClass(status: string) {
  if (props.status === status) return 'border-red-500 bg-red-500 text-white'
  if (isReached(status)) return 'border-red-300 bg-red-100 text-red-600'
  return 'border-gray-200 bg-white text-gray-300'
}

// Timestamp a mostrar bajo cada paso del timeline.
// PENDING siempre usa la fecha de creación; el paso actual usa statusUpdatedAt
// (no se conserva un historial por paso intermedio).
function stepTimestamp(status: string): string | null {
  if (status === 'PENDING') return props.createdAt
  if (props.status === status) return props.statusUpdatedAt ?? null
  return null
}
</script>
