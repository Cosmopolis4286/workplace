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
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <div v-if="!ledger" class="py-10 text-center text-sm text-gray-400">Cargando libreta…</div>
              <template v-else>
                <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                  {{ ledger.customer.name }}
                </DialogTitle>
                <p v-if="ledger.customer.phone" class="text-sm text-gray-500">{{ ledger.customer.phone }}</p>

                <div class="mt-4 grid grid-cols-2 gap-3">
                  <div class="rounded-xl bg-gray-50 p-3">
                    <p class="text-xs text-gray-500">Debe</p>
                    <p class="text-xl font-bold text-gray-900">${{ fmt(ledger.balanceUsd) }}</p>
                    <p v-if="vesPerUsd" class="text-xs text-gray-400">≈ Bs {{ fmt(ledger.balanceUsd * vesPerUsd) }}</p>
                  </div>
                  <div class="rounded-xl bg-gray-50 p-3">
                    <p class="text-xs text-gray-500">Tope de fiado</p>
                    <div v-if="editingLimit" class="mt-1 flex items-center gap-1">
                      <input v-model="limitInput" type="number" min="0" step="0.01" class="input-field !py-1 text-sm" placeholder="Sin tope">
                      <button class="text-xs font-medium text-indigo-600" @click="saveLimit">Guardar</button>
                    </div>
                    <template v-else>
                      <p class="text-xl font-bold" :class="overLimit ? 'text-red-600' : 'text-gray-900'">
                        {{ ledger.customer.creditLimitUsd != null ? `$${fmt(ledger.customer.creditLimitUsd)}` : 'Sin tope' }}
                      </p>
                      <button class="text-xs font-medium text-indigo-600 hover:underline" @click="startEditLimit">Cambiar</button>
                    </template>
                  </div>
                </div>
                <p v-if="overLimit" class="mt-2 text-xs text-red-600">Este cliente pasó el tope que le pusiste.</p>

                <a
                  :href="reminderUrl"
                  target="_blank"
                  rel="noopener"
                  class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <ChatBubbleLeftEllipsisIcon class="h-5 w-5" />
                  Recordar por WhatsApp
                </a>

                <h4 class="mt-6 mb-2 text-sm font-semibold text-gray-700">Movimientos</h4>
                <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
                  <div v-for="r in ledger.receivables" :key="r.id" class="rounded-xl border border-gray-100 p-3">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-gray-900">{{ r.description }}</p>
                        <p class="text-xs text-gray-500">{{ formatDate(r.createdAt) }} · {{ money(r.amount, r.currencyCode) }}</p>
                      </div>
                      <div class="text-right">
                        <p v-if="r.status === 'PAID'" class="text-xs font-medium text-green-700">Pagado</p>
                        <template v-else>
                          <p class="text-sm font-semibold text-gray-900">Resta {{ money(r.balance, r.currencyCode) }}</p>
                          <button class="text-xs font-medium text-indigo-600 hover:underline" @click="emit('pay', r)">Abonar</button>
                        </template>
                      </div>
                    </div>
                    <ul v-if="r.payments?.length" class="mt-2 space-y-0.5 border-t border-gray-50 pt-2">
                      <li v-for="p in r.payments" :key="p.id" class="flex justify-between text-xs text-gray-500">
                        <span>Abono {{ formatDate(p.createdAt) }}<template v-if="p.method"> · {{ PAYMENT_METHOD_LABELS[p.method] }}</template></span>
                        <span>{{ money(p.amount, p.currencyCode) }}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="mt-5 flex justify-end">
                  <button class="btn-secondary" @click="emit('close')">Cerrar</button>
                </div>
              </template>
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
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/vue/24/outline'
import {
  useAccounts,
  PAYMENT_METHOD_LABELS,
  type CustomerLedger,
  type Receivable,
} from '~/composables/commerce/useAccounts'
import { useDualPrice } from '~/composables/catalog/useDualPrice'
import { useAuth } from '~/composables/auth/useAuth'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { fiadoReminderText, fiadoReminderUrl } from '~/utils/fiadoReminder'

const props = defineProps<{ isOpen: boolean; customerId: string | null }>()
const emit = defineEmits<{ close: []; pay: [receivable: Receivable]; changed: [] }>()

const { loadCustomerLedger, updateCreditLimit } = useAccounts()
const { loadRate, vesPerUsd } = useDualPrice()
const { commerce } = useAuth()
const { formatDate } = useDateFormat()

const ledger = ref<CustomerLedger | null>(null)
const editingLimit = ref(false)
const limitInput = ref<number | string>('')

const fmt = (n: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
function money(n: number, code: string) {
  return code === 'VES' ? `Bs ${fmt(n)}` : code === 'USD' ? `$${fmt(n)}` : `${fmt(n)} ${code}`
}

const overLimit = computed(() =>
  !!ledger.value && ledger.value.customer.creditLimitUsd != null
  && ledger.value.balanceUsd > ledger.value.customer.creditLimitUsd,
)

const reminderUrl = computed(() => {
  if (!ledger.value) return '#'
  const text = fiadoReminderText({
    customerName: ledger.value.customer.name,
    commerceName: commerce.value?.name,
    balanceUsd: ledger.value.balanceUsd,
    vesPerUsd: vesPerUsd.value,
  })
  return fiadoReminderUrl(ledger.value.customer.phone, text)
})

async function refresh() {
  if (!props.customerId) return
  ledger.value = await loadCustomerLedger(props.customerId)
}

function startEditLimit() {
  limitInput.value = ledger.value?.customer.creditLimitUsd ?? ''
  editingLimit.value = true
}

async function saveLimit() {
  if (!ledger.value) return
  const raw = String(limitInput.value).trim()
  const value = raw === '' ? null : Number(raw)
  if (value !== null && (!Number.isFinite(value) || value < 0)) return
  if (await updateCreditLimit(ledger.value.customer.id, value)) {
    ledger.value.customer.creditLimitUsd = value
    editingLimit.value = false
    emit('changed')
  }
}

watch(() => [props.isOpen, props.customerId], ([open]) => {
  if (!open) return
  ledger.value = null
  editingLimit.value = false
  loadRate()
  refresh()
})

defineExpose({ refresh })
</script>
