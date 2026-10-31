<template>
  <div class="space-y-4">
    <div>
      <p class="text-xs font-medium text-gray-700 mb-2">1. Elige cómo pagar y copia los datos</p>
      <p v-if="accounts.length === 0" class="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
        No hay cuentas disponibles para pagar en este momento.
      </p>
      <div class="space-y-2">
        <label
          v-for="acc in accounts"
          :key="acc.id"
          class="block p-3 rounded-xl border-2 transition-colors"
          :class="[
            selectedId === acc.id ? 'border-emerald-500 bg-emerald-50/40' : 'border-gray-200',
            acc.amount === null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2 min-w-0">
              <input
                v-model="selectedId"
                type="radio"
                :value="acc.id"
                :disabled="acc.amount === null"
                class="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900">
                  {{ DIRECT_PAYMENT_METHOD_LABELS[acc.method] }}
                  <span v-if="acc.bankName" class="font-normal text-gray-500">· {{ acc.bankName }}</span>
                </p>
                <p v-if="acc.amount === null" class="text-xs text-amber-600">Sin tasa de cambio vigente</p>
              </div>
            </div>
            <p class="text-base font-black text-gray-900 flex-shrink-0">
              {{ formatPaymentAmount(acc.amount, acc.currency) }}
            </p>
          </div>

          <dl v-if="selectedId === acc.id" class="mt-3 space-y-1.5">
            <div v-for="field in fieldsOf(acc)" :key="field.label" class="flex items-center justify-between gap-2 text-sm">
              <dt class="text-gray-500">{{ field.label }}</dt>
              <dd class="flex items-center gap-1.5 min-w-0">
                <span class="font-mono text-gray-900 truncate">{{ field.value }}</span>
                <button
                  type="button"
                  class="p-1 rounded hover:bg-white text-gray-400 hover:text-emerald-600"
                  :aria-label="`Copiar ${field.label}`"
                  @click.prevent="copy(field.value, field.label)"
                >
                  <CheckIcon v-if="copied === field.label" class="h-4 w-4 text-emerald-600" />
                  <ClipboardDocumentIcon v-else class="h-4 w-4" />
                </button>
              </dd>
            </div>
            <p v-if="acc.exchangeRate" class="text-[11px] text-gray-400 pt-1">
              Equivale a {{ formatPaymentAmount(baseAmount, baseCurrency) }}
              a {{ Number(acc.exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 4 }) }} {{ acc.currency }} por {{ baseCurrency }}.
            </p>
          </dl>
        </label>
      </div>
    </div>

    <form class="space-y-3" novalidate @submit.prevent="submit">
      <p class="text-xs font-medium text-gray-700">2. Cuando hayas pagado, reporta la referencia</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Número de referencia *</label>
          <input
            v-model="form.reference"
            type="text"
            inputmode="numeric"
            maxlength="30"
            placeholder="Ej. 00123456"
            class="input-field font-mono"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Fecha del pago *</label>
          <input v-model="form.paidAt" type="date" :max="today" :min="minDate" class="input-field" />
        </div>
      </div>
      <div v-if="selectedAccount && selectedAccount.method !== 'ZELLE'">
        <label class="block text-xs text-gray-500 mb-1">Banco desde el que pagaste</label>
        <select v-model="form.payerBankCode" class="input-field bg-white">
          <option value="">Prefiero no indicarlo</option>
          <option v-for="bank in banks" :key="bank.code" :value="bank.code">{{ bank.code }} · {{ bank.name }}</option>
        </select>
      </div>
      <p v-if="localError || error" class="text-sm text-red-600">{{ localError || error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="submitting || !selectedId">
        {{ submitting ? 'Enviando…' : 'Reportar pago' }}
      </button>
      <p class="text-[11px] text-gray-400 text-center">
        Reportar una referencia falsa puede suspender tu cuenta.
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline'
import {
  formatPaymentAmount,
  DIRECT_PAYMENT_METHOD_LABELS,
  type PaymentBank,
  type PayableSellerAccount,
} from '~/composables/payments/useDirectPayments'

export interface PaymentReportPayload {
  accountId: string
  reference: string
  paidAt: string
  payerBankCode?: string
}

const props = defineProps<{
  accounts: PayableSellerAccount[]
  // Monto y moneda del cobro original (para explicar la conversión).
  baseAmount: number
  baseCurrency: string
  banks: PaymentBank[]
  submitting: boolean
  error?: string | null
}>()
const emit = defineEmits<{ submit: [payload: PaymentReportPayload] }>()

// Fecha local (no UTC): en Venezuela, de noche, toISOString ya marca el día siguiente.
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = toDateInput(new Date())
// Mismo límite que el backend (PAID_AT_MAX_AGE_DAYS).
const minDate = toDateInput(new Date(Date.now() - 30 * 24 * 3600 * 1000))

const selectedId = ref('')
const copied = ref<string | null>(null)
const localError = ref<string | null>(null)
const form = ref({ reference: '', paidAt: today, payerBankCode: '' })

const selectedAccount = computed(() => props.accounts.find(a => a.id === selectedId.value) ?? null)

watch(
  () => props.accounts,
  (accounts) => {
    if (!accounts.some(a => a.id === selectedId.value)) {
      selectedId.value = accounts.find(a => a.amount !== null)?.id ?? ''
    }
  },
  { immediate: true },
)

function fieldsOf(acc: PayableSellerAccount) {
  const fields: { label: string; value: string }[] = []
  if (acc.method === 'ZELLE') fields.push({ label: 'Correo', value: acc.email ?? '' })
  if (acc.method === 'PAGO_MOVIL') fields.push({ label: 'Teléfono', value: acc.phone ?? '' })
  if (acc.method === 'BANK_TRANSFER') fields.push({ label: 'Cuenta', value: acc.accountNumber ?? '' })
  if (acc.bankCode) fields.push({ label: 'Banco', value: acc.bankCode })
  fields.push({ label: 'Cédula/RIF', value: acc.holderDocument })
  fields.push({ label: 'Titular', value: acc.holderName })
  if (acc.amount !== null) fields.push({ label: 'Monto', value: Number(acc.amount).toFixed(2) })
  return fields
}

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = label
    setTimeout(() => { if (copied.value === label) copied.value = null }, 1500)
  } catch {
    // Sin permiso de portapapeles: el dato sigue visible para copiarlo a mano.
  }
}

function submit() {
  localError.value = null
  const reference = form.value.reference.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9-]{4,30}$/.test(reference)) {
    localError.value = 'Escribe la referencia tal como aparece en tu comprobante (4 a 30 caracteres).'
    return
  }
  if (!form.value.paidAt) {
    localError.value = 'Indica la fecha del pago.'
    return
  }
  if (!selectedId.value) return
  // Mediodía local: evita que la zona horaria corra la fecha un día.
  const paidAt = new Date(`${form.value.paidAt}T12:00:00`)
  const effective = paidAt.getTime() > Date.now() ? new Date() : paidAt
  emit('submit', {
    accountId: selectedId.value,
    reference,
    paidAt: effective.toISOString(),
    payerBankCode: form.value.payerBankCode || undefined,
  })
}

defineExpose({ reset: () => { form.value = { reference: '', paidAt: today, payerBankCode: '' } } })
</script>
