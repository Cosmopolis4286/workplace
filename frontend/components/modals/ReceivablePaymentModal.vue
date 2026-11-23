<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="emit('close')">
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
                Registrar abono
              </DialogTitle>
              <p v-if="receivable" class="text-sm text-gray-500 mb-4">
                {{ receivable.customer?.name ?? 'Sin cliente' }} · {{ receivable.description }}
              </p>

              <div v-if="receivable" class="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Saldo pendiente</span>
                  <span class="font-semibold text-gray-900">{{ money(balance, receivable.currencyCode) }}</span>
                </div>
                <p v-if="balanceOther" class="text-right text-xs text-gray-400">≈ {{ balanceOther }} a la tasa de hoy</p>
              </div>

              <form class="space-y-4" @submit.prevent="handleSubmit">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                    <input v-model.number="form.amount" type="number" step="0.01" min="0.01" required class="input-field">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                    <select v-model="form.currencyCode" class="input-field">
                      <option value="USD">$ (USD)</option>
                      <option v-if="vesPerUsd || receivable?.currencyCode === 'VES'" value="VES">Bs (VES)</option>
                    </select>
                  </div>
                </div>
                <button type="button" class="text-xs font-medium text-indigo-600 hover:underline" @click="fillBalance">
                  Paga todo el saldo
                </button>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Cómo pagó</label>
                  <select v-model="form.method" class="input-field">
                    <option v-for="(label, key) in PAYMENT_METHOD_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                  <input v-model="form.note" type="text" maxlength="200" class="input-field" placeholder="Ej. referencia del Pago Móvil">
                </div>

                <p v-if="appliedPreview" class="text-xs text-gray-500">{{ appliedPreview }}</p>
                <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

                <div class="flex justify-end space-x-3 pt-2">
                  <button type="button" class="btn-secondary" @click="emit('close')">Cancelar</button>
                  <button type="submit" class="btn-primary" :disabled="saving || !form.amount">
                    {{ saving ? 'Guardando…' : 'Registrar abono' }}
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
import { ref, computed, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import {
  useAccounts,
  receivableBalance,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type Receivable,
} from '~/composables/commerce/useAccounts'
import { useDualPrice } from '~/composables/catalog/useDualPrice'

const props = defineProps<{ isOpen: boolean; receivable: Receivable | null }>()
const emit = defineEmits<{ close: []; saved: [receivable: Receivable] }>()

const { addPayment, error } = useAccounts()
const { loadRate, vesPerUsd } = useDualPrice()

const saving = ref(false)
const form = ref({ amount: 0, currencyCode: 'USD', method: 'CASH' as PaymentMethod, note: '' })

const balance = computed(() => (props.receivable ? receivableBalance(props.receivable) : 0))

const fmt = (n: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
function money(n: number, code: string) {
  return code === 'VES' ? `Bs ${fmt(n)}` : code === 'USD' ? `$${fmt(n)}` : `${fmt(n)} ${code}`
}

// Convierte entre $ y Bs con la tasa de hoy (la misma que usa el backend).
function convert(n: number, from: string, to: string): number | null {
  if (from === to) return n
  const rate = vesPerUsd.value
  if (!rate) return null
  if (from === 'USD' && to === 'VES') return n * rate
  if (from === 'VES' && to === 'USD') return n / rate
  return null
}

const balanceOther = computed(() => {
  if (!props.receivable) return null
  const other = props.receivable.currencyCode === 'VES' ? 'USD' : 'VES'
  const v = convert(balance.value, props.receivable.currencyCode, other)
  return v === null ? null : money(v, other)
})

const appliedPreview = computed(() => {
  const r = props.receivable
  if (!r || !form.value.amount || form.value.currencyCode === r.currencyCode) return null
  const applied = convert(form.value.amount, form.value.currencyCode, r.currencyCode)
  return applied === null ? null : `Descuenta ${money(applied, r.currencyCode)} de la cuenta.`
})

function fillBalance() {
  const r = props.receivable
  if (!r) return
  const v = convert(balance.value, r.currencyCode, form.value.currencyCode)
  form.value.amount = v === null ? balance.value : +v.toFixed(2)
}

watch(() => props.isOpen, (open) => {
  if (!open) return
  loadRate()
  error.value = null
  form.value = { amount: 0, currencyCode: props.receivable?.currencyCode ?? 'USD', method: 'CASH', note: '' }
})

async function handleSubmit() {
  if (saving.value || !props.receivable) return
  saving.value = true
  try {
    const updated = await addPayment(props.receivable.id, {
      amount: form.value.amount,
      currencyCode: form.value.currencyCode,
      method: form.value.method,
      note: form.value.note.trim() || undefined,
    })
    if (updated) {
      emit('saved', updated)
      emit('close')
    }
  } finally {
    saving.value = false
  }
}
</script>
