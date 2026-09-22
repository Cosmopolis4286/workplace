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
            <DialogPanel class="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl">
              <DialogTitle class="text-lg font-semibold text-gray-900 mb-4">Nueva campaña de compra agrupada</DialogTitle>

              <div v-if="localError" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {{ localError }}
              </div>

              <form @submit.prevent="handleSubmit" class="space-y-3">
                <input v-model="form.title" type="text" required class="input-field" placeholder="Título (ej. Compra agrupada de aceite)">
                <textarea v-model="form.description" class="input-field" rows="2" placeholder="Descripción (opcional)" />

                <div class="grid grid-cols-2 gap-3">
                  <input v-model="form.unit" type="text" required class="input-field" placeholder="Unidad (ej. caja, kg)">
                  <input v-model="form.currencyCode" type="text" required maxlength="3" class="input-field uppercase" placeholder="Moneda (ej. USD)">
                </div>

                <div>
                  <label class="block text-sm text-gray-600 mb-1">Fecha límite</label>
                  <input v-model="form.deadline" type="date" required class="input-field" :min="minDate">
                </div>

                <div class="border-t border-gray-100 pt-3">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-medium text-gray-700">Tramos de precio por volumen</h4>
                    <button type="button" class="text-xs text-blue-600 hover:text-blue-800 font-medium" @click="addTier">
                      + Agregar tramo
                    </button>
                  </div>
                  <p class="text-xs text-gray-400 mb-2">
                    A mayor cantidad total comprometida entre todos los comercios, mejor precio unitario.
                  </p>
                  <div class="space-y-2">
                    <div v-for="(tier, idx) in form.priceTiers" :key="idx" class="flex items-center gap-2">
                      <input
                        v-model.number="tier.minQuantity" type="number" min="1" required
                        class="input-field flex-1" placeholder="Cantidad mínima"
                      >
                      <input
                        v-model.number="tier.unitPrice" type="number" min="0" step="0.01" required
                        class="input-field flex-1" placeholder="Precio unitario"
                      >
                      <button
                        type="button" class="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30"
                        :disabled="form.priceTiers.length <= 1" @click="removeTier(idx)"
                      >
                        <TrashIcon class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end gap-3 pt-2">
                  <button type="button" class="btn-secondary text-sm" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary text-sm" :disabled="saving">
                    {{ saving ? 'Creando...' : 'Crear campaña' }}
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
import { ref, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { useGroupBuying } from '~/composables/commerce/useGroupBuying'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; created: [] }>()

const { createCampaign } = useGroupBuying()

const localError = ref<string | null>(null)
const saving = ref(false)

const minDate = computed(() => new Date().toISOString().split('T')[0])

const defaultForm = () => ({
  title: '',
  description: '',
  unit: '',
  currencyCode: 'USD',
  deadline: '',
  priceTiers: [{ minQuantity: null as number | null, unitPrice: null as number | null }],
})
const form = ref(defaultForm())

function addTier() {
  form.value.priceTiers.push({ minQuantity: null, unitPrice: null })
}

function removeTier(idx: number) {
  form.value.priceTiers.splice(idx, 1)
}

async function handleSubmit() {
  localError.value = null

  const tiers = form.value.priceTiers.filter(t => t.minQuantity != null && t.unitPrice != null)
  if (tiers.length === 0) {
    localError.value = 'Agrega al menos un tramo de precio válido.'
    return
  }

  saving.value = true
  const result = await createCampaign({
    title: form.value.title,
    description: form.value.description || undefined,
    unit: form.value.unit,
    currencyCode: form.value.currencyCode,
    deadline: new Date(form.value.deadline).toISOString(),
    priceTiers: tiers as { minQuantity: number; unitPrice: number }[],
  })
  saving.value = false

  if (!result) {
    localError.value = 'No se pudo crear la campaña. Verifica los tramos de precio y la fecha límite.'
    return
  }

  form.value = defaultForm()
  emit('created')
  emit('close')
}

function closeModal() {
  localError.value = null
  emit('close')
}
</script>
