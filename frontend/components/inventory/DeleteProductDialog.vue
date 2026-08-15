<template>
  <TransitionRoot appear :show="!!product" as="template">
    <Dialog as="div" @close="$emit('close')" class="relative z-50">
      <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black bg-opacity-30" />
      </TransitionChild>
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
          <DialogPanel class="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
            <DialogTitle class="text-base font-semibold text-gray-900 mb-2">Eliminar producto</DialogTitle>
            <p class="text-sm text-gray-500 mb-6">
              ¿Eliminar <strong class="text-gray-700">{{ product?.name }}</strong>? Esta acción no se puede deshacer.
            </p>
            <div class="flex gap-3 justify-end">
              <button @click="$emit('close')" class="btn-secondary text-sm py-2">Cancelar</button>
              <button @click="$emit('confirm')" :disabled="deleting" class="btn-primary text-sm py-2 bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700">
                {{ deleting ? 'Eliminando…' : 'Eliminar' }}
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

defineProps({
  product: Object,
  deleting: Boolean,
})

defineEmits(['close', 'confirm'])
</script>
