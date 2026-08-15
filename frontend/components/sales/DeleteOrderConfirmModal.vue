<template>
  <TransitionRoot appear :show="!!order" as="template">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <div class="fixed inset-0 bg-black/25" />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Eliminar pedido</DialogTitle>
          <p class="text-sm text-gray-600 mb-5">
            ¿Eliminar pedido <strong>#{{ order?.orderNumber }}</strong>? Esta acción no se puede deshacer.
          </p>
          <div class="flex justify-end gap-3">
            <button class="btn-secondary" @click="$emit('close')">Cancelar</button>
            <button class="btn-danger" @click="$emit('confirm')">Eliminar</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'
import type { Order } from '~/composables/catalog/useMerchantOrders'

defineProps<{
  order: Order | null
}>()

defineEmits<{
  close: []
  confirm: []
}>()
</script>

<style scoped>
.btn-danger {
  @apply px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors;
}
</style>
