<template>
  <TransitionRoot appear :show="!!expense" as="template">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <div class="fixed inset-0 bg-black/25" />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Marcar como pagado</DialogTitle>
          <p class="text-sm text-gray-600 mb-5">
            ¿Marcar "<strong>{{ expense?.description }}</strong>" como pagado? Afecta los
            reportes financieros del período.
          </p>
          <div class="flex justify-end gap-3">
            <button class="btn-secondary" :disabled="saving" @click="$emit('close')">Cancelar</button>
            <button class="btn-primary" :disabled="saving" @click="$emit('confirm')">
              {{ saving ? 'Guardando…' : 'Marcar como pagado' }}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'
import type { Expense } from '~/composables/commerce/useExpenses'

defineProps<{
  expense: Expense | null
  saving: boolean
}>()

defineEmits<{
  close: []
  confirm: []
}>()
</script>
