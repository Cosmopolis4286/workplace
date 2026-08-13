<template>
  <TransitionGroup
    tag="div"
    name="alert-list"
    class="space-y-3 mb-6"
  >
    <div
      v-for="alert in activeAlerts"
      :key="alert.id"
      class="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm"
      :class="{
        'bg-amber-50 border-amber-200': alert.type === 'warning',
        'bg-red-50 border-red-200':    alert.type === 'danger',
        'bg-blue-50 border-blue-200':  alert.type === 'info',
      }"
    >
      <!-- Icono -->
      <component
        :is="alertIcon(alert.type)"
        class="h-5 w-5 flex-shrink-0 mt-0.5"
        :class="{
          'text-amber-500': alert.type === 'warning',
          'text-red-500':   alert.type === 'danger',
          'text-blue-500':  alert.type === 'info',
        }"
      />

      <!-- Contenido -->
      <div class="flex-1 min-w-0">
        <p
          class="font-semibold"
          :class="{
            'text-amber-800': alert.type === 'warning',
            'text-red-800':   alert.type === 'danger',
            'text-blue-800':  alert.type === 'info',
          }"
        >{{ alert.title }}</p>
        <p
          class="mt-0.5"
          :class="{
            'text-amber-700': alert.type === 'warning',
            'text-red-700':   alert.type === 'danger',
            'text-blue-700':  alert.type === 'info',
          }"
        >{{ alert.message }}</p>
      </div>

      <!-- Acción -->
      <NuxtLink
        v-if="alert.actionLabel && alert.actionRoute"
        :to="alert.actionRoute"
        class="flex-shrink-0 text-xs font-semibold underline underline-offset-2 whitespace-nowrap"
        :class="{
          'text-amber-700 hover:text-amber-900': alert.type === 'warning',
          'text-red-700 hover:text-red-900':     alert.type === 'danger',
          'text-blue-700 hover:text-blue-900':   alert.type === 'info',
        }"
      >
        {{ alert.actionLabel }} →
      </NuxtLink>

      <!-- Cerrar -->
      <button
        @click="dismiss(alert.id)"
        class="flex-shrink-0 rounded-md p-0.5 transition-colors"
        :class="{
          'text-amber-400 hover:text-amber-700 hover:bg-amber-100': alert.type === 'warning',
          'text-red-400 hover:text-red-700 hover:bg-red-100':       alert.type === 'danger',
          'text-blue-400 hover:text-blue-700 hover:bg-blue-100':    alert.type === 'info',
        }"
        aria-label="Cerrar alerta"
      >
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { XMarkIcon, ExclamationTriangleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import { useDashboardAlerts } from '~/composables/dashboard/useDashboardAlerts'

const { activeAlerts, dismiss, hydrate } = useDashboardAlerts()

function alertIcon(type: 'warning' | 'danger' | 'info') {
  if (type === 'warning') return ExclamationTriangleIcon
  if (type === 'danger')  return ExclamationCircleIcon
  return InformationCircleIcon
}

onMounted(() => hydrate())
</script>

<style scoped>
.alert-list-enter-active,
.alert-list-leave-active {
  transition: all 0.25s ease;
}
.alert-list-enter-from,
.alert-list-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
