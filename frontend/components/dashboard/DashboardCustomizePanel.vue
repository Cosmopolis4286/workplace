<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div v-if="open" class="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-indigo-900 text-sm">Personalizar Dashboard</h3>
        <button
          @click="emit('reset')"
          class="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          Restaurar por defecto
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label
          v-for="item in kpiItems"
          :key="item.id"
          class="flex items-center gap-2 p-2 rounded-lg bg-white border border-indigo-100 cursor-pointer hover:bg-indigo-50 transition-colors select-none"
        >
          <input
            type="checkbox"
            :checked="item.visible"
            @change="emit('toggle', item.id)"
            class="h-4 w-4 rounded text-indigo-600 border-gray-300 cursor-pointer"
          />
          <span class="text-sm text-gray-700 font-medium">{{ widgetName(item.id) }}</span>
        </label>
      </div>

      <p class="text-xs text-indigo-400 mt-3">
        Arrastra las tarjetas en el dashboard para cambiar su orden.
      </p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { type WidgetLayoutItem } from '~/composables/dashboard/useDashboardLayout'

const props = defineProps<{
  open: boolean
  kpiItems: WidgetLayoutItem[]
  widgetName: (id: string) => string
}>()

const emit = defineEmits<{
  toggle: [id: string]
  reset: []
}>()
</script>
