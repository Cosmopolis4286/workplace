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
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-1">
                Cargar cotización
              </DialogTitle>
              <p class="text-xs text-gray-400 mb-4">{{ productName }}</p>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <select v-model="form.supplierId" required class="input-field">
                    <option value="" disabled>Seleccionar proveedor</option>
                    <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                      {{ supplier.name }}
                    </option>
                  </select>
                  <p v-if="suppliers.length === 0" class="text-xs text-amber-600 mt-1">
                    Todavía no tenés proveedores cargados.
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Precio ({{ form.currencyCode }})</label>
                    <input v-model.number="form.price" type="number" step="0.01" min="0" required class="input-field">
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
                  <label class="block text-sm font-medium text-gray-700 mb-1">Tiempo de entrega (días, opcional)</label>
                  <input v-model.number="form.leadTimeDays" type="number" min="0" class="input-field" placeholder="Ej. 3">
                </div>

                <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

                <div class="flex justify-end space-x-3 pt-2">
                  <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary" :disabled="saving || !suppliers.length">
                    {{ saving ? 'Guardando…' : 'Guardar cotización' }}
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
import { ref, watch, onMounted } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useDefaultRate } from '~/composables/wallets/useDefaultRate'
import { useSuppliers } from '~/composables/commerce/useSuppliers'

const props = defineProps<{
  isOpen: boolean
  productId: string
  productName?: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const { defaultRate, load: loadDefaultRate } = useDefaultRate()
const { suppliers, loadSuppliers, createQuote, error } = useSuppliers()
onMounted(() => {
  loadDefaultRate()
  loadSuppliers()
})

const saving = ref(false)

const form = ref({
  supplierId: '',
  price: 0,
  currencyCode: 'USD',
  leadTimeDays: null as number | null,
})

function resetForm() {
  form.value = { supplierId: '', price: 0, currencyCode: 'USD', leadTimeDays: null }
}

watch(() => props.isOpen, (open) => { if (open) resetForm() })

function closeModal() {
  emit('close')
}

async function handleSubmit() {
  if (saving.value || !form.value.supplierId) return
  saving.value = true
  try {
    const quote = await createQuote(form.value.supplierId, {
      productId: props.productId,
      price: form.value.price,
      currencyCode: form.value.currencyCode,
      leadTimeDays: form.value.leadTimeDays ?? undefined,
    })
    if (quote) {
      emit('saved')
      closeModal()
    }
  } finally {
    saving.value = false
  }
}
</script>
