<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-1">
                Registrar compra
              </DialogTitle>
              <p class="text-xs text-gray-400 mb-4">{{ productName }}</p>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Proveedor (opcional)</label>
                  <select v-model="form.supplierId" class="input-field">
                    <option value="">Sin especificar</option>
                    <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                      {{ supplier.name }}
                    </option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input v-model.number="form.quantity" type="number" min="1" required class="input-field">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                    <select v-model="form.currencyCode" class="input-field">
                      <option value="USD">USD</option>
                      <option v-if="defaultRate && defaultRate.code !== 'USD'" :value="defaultRate.code">
                        {{ defaultRate.code }}
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Costo unitario ({{ form.currencyCode }})
                  </label>
                  <input v-model.number="form.unitCost" type="number" step="0.01" min="0" required class="input-field">
                  <p v-if="usdEquivalent !== null" class="text-xs text-gray-400 mt-1">
                    ≈ ${{ usdEquivalent.toFixed(2) }} USD por unidad
                    <span v-if="defaultRate">(tasa {{ defaultRate.rateToUsd.toLocaleString('es-VE', { maximumFractionDigits: 4 }) }})</span>
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                  <input v-model="form.notes" type="text" class="input-field" placeholder="Ej. proveedor, factura #...">
                </div>

                <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

                <div class="flex justify-end space-x-3 pt-2">
                  <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary" :disabled="saving">
                    {{ saving ? 'Guardando…' : 'Registrar compra' }}
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
import { ref, computed, watch, onMounted } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useDefaultRate } from '~/composables/wallets/useDefaultRate'
import { usePurchases } from '~/composables/commerce/usePurchases'
import { useSuppliers } from '~/composables/commerce/useSuppliers'

const props = defineProps<{
  isOpen: boolean
  productId: string
  productName?: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const { defaultRate, load: loadDefaultRate } = useDefaultRate()
const { suppliers, loadSuppliers } = useSuppliers()
onMounted(() => {
  loadDefaultRate()
  loadSuppliers()
})

const { createPurchase, error } = usePurchases()

const saving = ref(false)

const form = ref({
  supplierId: '',
  quantity: 1,
  unitCost: 0,
  currencyCode: 'USD',
  notes: '',
})

function resetForm() {
  form.value = { supplierId: '', quantity: 1, unitCost: 0, currencyCode: 'USD', notes: '' }
}

watch(() => props.isOpen, (open) => { if (open) resetForm() })

const usdEquivalent = computed(() => {
  if (form.value.currencyCode === 'USD') return form.value.unitCost
  if (!defaultRate.value || defaultRate.value.code !== form.value.currencyCode) return null
  return form.value.unitCost / defaultRate.value.rateToUsd
})

function closeModal() {
  emit('close')
}

async function handleSubmit() {
  if (saving.value) return
  saving.value = true
  try {
    const purchase = await createPurchase({
      productId: props.productId,
      supplierId: form.value.supplierId || undefined,
      quantity: form.value.quantity,
      unitCost: form.value.unitCost,
      currencyCode: form.value.currencyCode,
      notes: form.value.notes || undefined,
    })
    if (purchase) {
      emit('saved')
      closeModal()
    }
  } finally {
    saving.value = false
  }
}
</script>
