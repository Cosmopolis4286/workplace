<template>
  <div id="quick-actions" class="card-premium p-6">
    <div class="flex items-center mb-2">
      <div class="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg mr-3">
        <CogIcon class="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-gray-900">Acciones Rápidas</h3>
        <p class="text-sm text-gray-500">Elige hasta {{ MAX_DASHBOARD_QUICK_ACTIONS }} acciones para tu dashboard</p>
      </div>
    </div>

    <div v-if="available.length === 0" class="text-sm text-gray-500 py-4">
      No tienes acciones disponibles para configurar.
    </div>

    <div v-else class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
      <button
        v-for="action in available"
        :key="action.id"
        type="button"
        @click="toggle(action.id)"
        :disabled="!selection.includes(action.id) && selection.length >= MAX_DASHBOARD_QUICK_ACTIONS"
        class="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-white overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        :class="[gradientClasses[action.color], selection.includes(action.id) ? 'ring-2 ring-offset-2 ring-purple-600 scale-[1.02]' : 'hover:scale-[1.02]']"
      >
        <svg v-if="selection.includes(action.id)" class="absolute top-1.5 right-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
        </svg>
        <span class="text-xs font-semibold leading-none">{{ action.name }}</span>
      </button>
    </div>

    <div class="mt-5 flex items-center gap-3">
      <button
        type="button"
        @click="save"
        :disabled="saving"
        class="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <span v-if="saving" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        {{ saving ? 'Guardando...' : 'Guardar Acciones' }}
      </button>
      <transition name="fade">
        <span v-if="msg" class="text-sm font-medium text-green-700">{{ msg }}</span>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { CogIcon } from '@heroicons/vue/24/outline'
import { useDashboardQuickActions, MAX_DASHBOARD_QUICK_ACTIONS } from '~/composables/dashboard/useDashboardQuickActions'

const gradientClasses: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  green: 'bg-gradient-to-br from-green-500 to-green-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  yellow: 'bg-gradient-to-br from-yellow-500 to-orange-500',
  red: 'bg-gradient-to-br from-red-500 to-red-600',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-600',
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
}

const { availableItems: available, savedIds, setDashboardQuickActionIds, saving } = useDashboardQuickActions()
const selection = ref<string[]>([])
const msg = ref('')

watch(savedIds, (ids) => {
  selection.value = ids.length > 0
    ? [...ids]
    : available.value.slice(0, MAX_DASHBOARD_QUICK_ACTIONS).map(a => a.id)
}, { immediate: true })

function toggle(id: string) {
  const idx = selection.value.indexOf(id)
  if (idx !== -1) {
    selection.value.splice(idx, 1)
  } else {
    if (selection.value.length >= MAX_DASHBOARD_QUICK_ACTIONS) return
    selection.value.push(id)
  }
}

async function save() {
  msg.value = ''
  try {
    await setDashboardQuickActionIds(selection.value)
    msg.value = 'Acciones rápidas actualizadas'
    setTimeout(() => { msg.value = '' }, 2500)
  } catch {
    msg.value = 'No se pudo guardar'
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
