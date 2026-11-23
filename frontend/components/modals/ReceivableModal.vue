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
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                Registrar cuenta por cobrar
              </DialogTitle>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input v-model="form.description" type="text" required class="input-field" placeholder="Ej. Fiado a Juan">
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <select v-model="form.customerId" class="input-field">
                    <option value="">Sin especificar</option>
                    <option :value="NEW_CUSTOMER">+ Cliente nuevo</option>
                    <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                      {{ customer.name }}
                    </option>
                  </select>
                  <p v-if="selectedLedger" class="mt-1 text-xs" :class="wouldPassLimit ? 'text-red-600' : 'text-gray-500'">
                    Debe {{ usd(selectedLedger.balanceUsd) }}<template v-if="selectedLedger.customer?.creditLimitUsd != null"> · tope {{ usd(selectedLedger.customer.creditLimitUsd) }}</template>
                    <template v-if="wouldPassLimit"> · con este fiado pasa su tope</template>
                  </p>
                </div>

                <div v-if="form.customerId === NEW_CUSTOMER" class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input v-model="form.customerName" type="text" required maxlength="120" class="input-field" placeholder="Ej. Pedro">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input v-model="form.customerPhone" type="tel" maxlength="30" class="input-field" placeholder="0414-1234567">
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Monto ({{ form.currencyCode }})</label>
                    <input v-model.number="form.amount" type="number" step="0.01" min="0" required class="input-field">
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
                  <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento (opcional)</label>
                  <input v-model="form.dueDate" type="date" class="input-field">
                </div>

                <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

                <div class="flex justify-end space-x-3 pt-2">
                  <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary" :disabled="saving">
                    {{ saving ? 'Guardando…' : 'Registrar' }}
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
import { useAccounts } from '~/composables/commerce/useAccounts'
import { useCustomers } from '~/composables/customers/useCustomers'
import { useToast } from '~/composables/ui/useToast'

const NEW_CUSTOMER = '__new__'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { defaultRate, load: loadDefaultRate } = useDefaultRate()
const { customers, loadClientes } = useCustomers()
onMounted(() => {
  loadDefaultRate()
  loadClientes()
})

const { createReceivable, error, ledger } = useAccounts()
const toast = useToast()

const usd = (n: number) =>
  '$' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

// Saldo y tope del cliente elegido (de la libreta ya cargada en la página).
const selectedLedger = computed(() =>
  ledger.value.find(r => r.customer?.id === form.value.customerId) ?? null,
)
const amountUsd = computed(() => {
  const a = Number(form.value.amount) || 0
  if (form.value.currencyCode === 'USD') return a
  const rate = defaultRate.value?.rateToUsd
  return rate ? a / Number(rate) : 0
})
const wouldPassLimit = computed(() => {
  const limit = selectedLedger.value?.customer?.creditLimitUsd
  return limit != null && selectedLedger.value!.balanceUsd + amountUsd.value > limit
})

const saving = ref(false)

const form = ref({
  description: '',
  customerId: '',
  customerName: '',
  customerPhone: '',
  amount: 0,
  currencyCode: 'USD',
  dueDate: '',
})

function resetForm() {
  form.value = { description: '', customerId: '', customerName: '', customerPhone: '', amount: 0, currencyCode: 'USD', dueDate: '' }
}

watch(() => props.isOpen, (open) => { if (open) resetForm() })

function closeModal() {
  emit('close')
}

async function handleSubmit() {
  if (saving.value) return
  saving.value = true
  try {
    const isNew = form.value.customerId === NEW_CUSTOMER
    const receivable = await createReceivable({
      description: form.value.description,
      customerId: !isNew && form.value.customerId ? form.value.customerId : undefined,
      customerName: isNew ? form.value.customerName.trim() : undefined,
      customerPhone: isNew && form.value.customerPhone.trim() ? form.value.customerPhone.trim() : undefined,
      amount: form.value.amount,
      currencyCode: form.value.currencyCode,
      dueDate: form.value.dueDate || undefined,
    })
    if (receivable) {
      const w = receivable.creditWarning
      if (w) {
        toast.error('Fiado registrado: pasó su tope', `Ahora debe ${usd(w.newBalanceUsd)} y su tope es ${usd(w.limitUsd)}.`)
      }
      if (isNew) loadClientes()
      emit('saved')
      closeModal()
    }
  } finally {
    saving.value = false
  }
}
</script>
