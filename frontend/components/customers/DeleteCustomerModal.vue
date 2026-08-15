<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="client" class="fixed inset-0 z-50 flex items-center justify-center p-4" @mousedown.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Eliminar cliente</h3>
          <p class="text-sm text-gray-600 mb-6">
            ¿Estás seguro de eliminar a <strong>{{ client?.name }}</strong>? Esta acción no se puede deshacer.
          </p>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
            <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
              :disabled="deleting" @click="$emit('confirm')">
              {{ deleting ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Customer } from '~/composables/customers/useCustomers'

defineProps<{
  client: Customer | null
  deleting: boolean
}>()

defineEmits<{
  close: []
  confirm: []
}>()
</script>
