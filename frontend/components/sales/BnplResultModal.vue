<template>
  <TransitionRoot appear :show="!!result" as="template">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <div class="fixed inset-0 bg-black/25" />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Financiamiento iniciado</DialogTitle>
          <p class="text-sm text-gray-600 mb-4">
            Comparte este link con el cliente para completar el financiamiento.
            <span v-if="result?.expiresAt">Vence: {{ formatDate(result.expiresAt) }}</span>
          </p>
          <div class="flex items-center gap-2 mb-5">
            <input :value="result?.checkoutUrl" readonly class="input-field text-xs" />
            <button class="btn-secondary text-sm px-3 py-2 flex-shrink-0" @click="copyLink">Copiar</button>
          </div>
          <div class="flex justify-end gap-3">
            <button class="btn-secondary" @click="$emit('close')">Cerrar</button>
            <a
              v-if="result?.checkoutUrl"
              :href="result.checkoutUrl"
              target="_blank"
              rel="noopener"
              class="btn-primary"
            >
              Abrir link
            </a>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'

const props = defineProps<{
  result: { checkoutUrl: string; expiresAt: string | null } | null
  formatDate: (d: string) => string
}>()

defineEmits<{
  close: []
}>()

function copyLink() {
  if (props.result?.checkoutUrl) navigator.clipboard?.writeText(props.result.checkoutUrl)
}
</script>
