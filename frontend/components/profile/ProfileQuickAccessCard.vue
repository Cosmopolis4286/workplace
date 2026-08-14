<template>
  <div id="quick-access" class="card-premium p-6">
    <div class="flex items-center mb-2">
      <div class="p-3 bg-gradient-to-br from-workplace-red to-red-700 rounded-xl shadow-lg mr-3">
        <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div>
        <h3 class="text-xl font-bold text-gray-900">Accesos Rápidos</h3>
        <p class="text-sm text-gray-500">Elige hasta {{ MAX_QUICK_ACCESS }} accesos para tu sidebar</p>
      </div>
    </div>

    <div v-if="available.length === 0" class="text-sm text-gray-500 py-4">
      No tienes accesos disponibles para configurar.
    </div>

    <div v-else class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
      <button
        v-for="item in available"
        :key="item.id"
        type="button"
        @click="toggle(item.id)"
        :disabled="!selection.includes(item.id) && selection.length >= MAX_QUICK_ACCESS"
        class="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-white overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        :class="[item.gradient, selection.includes(item.id) ? 'ring-2 ring-offset-2 ring-workplace-red scale-[1.02]' : 'hover:scale-[1.02]']"
      >
        <svg v-if="selection.includes(item.id)" class="absolute top-1.5 right-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
        </svg>
        <span class="text-xs font-semibold leading-none">{{ item.label }}</span>
      </button>
    </div>

    <div class="mt-5 flex items-center gap-3">
      <button
        type="button"
        @click="save"
        :disabled="saving"
        class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <span v-if="saving" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        {{ saving ? 'Guardando...' : 'Guardar Accesos' }}
      </button>
      <transition name="fade">
        <span v-if="msg" class="text-sm font-medium text-green-700">{{ msg }}</span>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuickAccess, MAX_QUICK_ACCESS } from '~/composables/dashboard/useQuickAccess'

const { availableItems: available, savedIds, setQuickAccessIds, saving } = useQuickAccess()
const selection = ref<string[]>([])
const msg = ref('')

watch(savedIds, (ids) => {
  selection.value = ids.length > 0
    ? [...ids]
    : available.value.slice(0, MAX_QUICK_ACCESS).map(i => i.id)
}, { immediate: true })

function toggle(id: string) {
  const idx = selection.value.indexOf(id)
  if (idx !== -1) {
    selection.value.splice(idx, 1)
  } else {
    if (selection.value.length >= MAX_QUICK_ACCESS) return
    selection.value.push(id)
  }
}

async function save() {
  msg.value = ''
  try {
    await setQuickAccessIds(selection.value)
    msg.value = 'Accesos rápidos actualizados'
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
