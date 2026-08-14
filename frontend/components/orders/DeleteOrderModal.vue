<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show && order" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-2">¿Eliminar pedido?</h3>
          <p class="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer. Se eliminará <strong>{{ order.orderNumber }}</strong>.</p>
          <div class="flex gap-3">
            <button class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
            <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors" :disabled="loading" @click="$emit('confirm')">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Order } from '~/composables/catalog/useMerchantOrders'

defineProps<{
  show: boolean
  order: Order | null
  loading: boolean
}>()

defineEmits<{
  close: []
  confirm: []
}>()
</script>
