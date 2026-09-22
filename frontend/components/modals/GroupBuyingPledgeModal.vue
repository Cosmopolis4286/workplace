<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
              <DialogTitle class="text-lg font-semibold text-gray-900 mb-1">Comprometer cantidad</DialogTitle>
              <p class="text-sm text-gray-500 mb-4">{{ campaign?.title }}</p>

              <div v-if="localError" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {{ localError }}
              </div>

              <div v-if="campaign" class="mb-4 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                <p class="flex justify-between">
                  <span class="text-gray-500">Total comprometido hoy</span>
                  <span class="font-medium text-gray-800">{{ campaign.totalQuantity }} {{ campaign.unit }}</span>
                </p>
                <p v-if="campaign.currentUnitPrice != null" class="flex justify-between">
                  <span class="text-gray-500">Precio actual</span>
                  <span class="font-medium text-green-700">{{ formatMoney(campaign.currentUnitPrice, campaign.currencyCode) }}</span>
                </p>
                <p v-if="campaign.nextTier" class="flex justify-between text-xs text-blue-600">
                  <span>Faltan {{ campaign.nextTier.unitsToUnlock }} {{ campaign.unit }} para {{ formatMoney(campaign.nextTier.unitPrice, campaign.currencyCode) }}</span>
                </p>
              </div>

              <form @submit.prevent="handleSubmit" class="space-y-3">
                <input
                  v-model.number="quantity" type="number" min="1" required autofocus
                  class="input-field" :placeholder="`Cantidad (${campaign?.unit ?? 'unidades'})`"
                >
                <div class="flex justify-end gap-3 pt-1">
                  <button type="button" class="btn-secondary text-sm" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary text-sm" :disabled="saving">
                    {{ saving ? 'Guardando...' : 'Confirmar compromiso' }}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useGroupBuying, type GroupBuyingCampaign } from '~/composables/commerce/useGroupBuying'

const props = defineProps<{ isOpen: boolean; campaign: GroupBuyingCampaign | null }>()
const emit = defineEmits<{ close: []; pledged: [] }>()

const { pledge } = useGroupBuying()

const localError = ref<string | null>(null)
const saving = ref(false)
const quantity = ref<number | null>(null)

watch(() => props.isOpen, (open) => {
  if (open) {
    quantity.value = null
    localError.value = null
  }
})

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: currencyCode }).format(amount)
}

async function handleSubmit() {
  if (!props.campaign || !quantity.value) return
  localError.value = null
  saving.value = true
  const result = await pledge(props.campaign.id, { quantity: quantity.value })
  saving.value = false

  if (!result) {
    localError.value = 'No se pudo registrar el compromiso.'
    return
  }
  emit('pledged')
  emit('close')
}

function closeModal() {
  localError.value = null
  emit('close')
}
</script>
