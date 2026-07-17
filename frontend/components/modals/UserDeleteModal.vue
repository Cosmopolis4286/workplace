<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="target" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="$emit('cancel')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-2">
            {{ bulkTargets.length > 1 ? `¿Eliminar ${bulkTargets.length} usuarios?` : '¿Eliminar usuario?' }}
          </h3>
          <p class="text-sm text-gray-500 mb-6">
            <template v-if="bulkTargets.length > 1">
              Se eliminarán permanentemente <strong>{{ bulkTargets.length }} cuentas</strong>.
            </template>
            <template v-else>
              Se eliminará permanentemente a <strong>{{ target.firstName }} {{ target.lastName }}</strong>.
            </template>
            Esta acción no se puede deshacer.
          </p>
          <div v-if="partialError" class="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">
            {{ partialError }}
          </div>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" @click="$emit('cancel')">Cancelar</button>
            <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
              :disabled="saving" @click="$emit('confirm')">
              {{ saving ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { UserItem } from '~/composables/useUsers'

defineProps<{
  target: UserItem | null
  bulkTargets: UserItem[]
  saving: boolean
  partialError?: string | null
}>()

defineEmits<{ cancel: []; confirm: [] }>()
</script>
