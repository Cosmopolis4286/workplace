<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="!submitting && $emit('close')" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 class="font-black text-gray-900">Pagar a {{ sellerName }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Pagas directo a la cuenta del vendedor y reportas la referencia. WorkPlace no recibe tu dinero.
            </p>
          </div>
          <button class="p-1 text-gray-400 hover:text-gray-600" :disabled="submitting" @click="$emit('close')">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="skeleton h-14 rounded-xl" />
          </div>

          <div v-else-if="loadError" class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            {{ loadError }}
          </div>

          <template v-else-if="session">
            <!-- Estado -->
            <div v-if="status === 'SUCCEEDED'" class="p-4 rounded-xl bg-green-50 border border-green-200 flex gap-3">
              <CheckCircleIcon class="h-5 w-5 text-green-600 flex-shrink-0" />
              <div class="text-sm text-green-800">
                <p class="font-semibold">Pago confirmado por el vendedor</p>
                <p v-if="lastReport" class="text-xs mt-0.5">
                  {{ formatPaymentAmount(lastReport.paidAmount, lastReport.paidCurrency) }} · ref. {{ lastReport.reference }}
                </p>
              </div>
            </div>
            <div v-else-if="status === 'PROCESSING'" class="p-4 rounded-xl bg-blue-50 border border-blue-200 flex gap-3">
              <ClockIcon class="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div class="text-sm text-blue-800">
                <p class="font-semibold">Pago reportado: esperando confirmación</p>
                <p v-if="lastReport" class="text-xs mt-0.5">
                  {{ formatPaymentAmount(lastReport.paidAmount, lastReport.paidCurrency) }} · ref. {{ lastReport.reference }}
                  · te avisaremos cuando el vendedor lo confirme.
                </p>
              </div>
            </div>
            <div v-else-if="status === 'REQUIRES_RECONCILIATION' && lastReport" class="p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3">
              <ExclamationTriangleIcon class="h-5 w-5 text-red-600 flex-shrink-0" />
              <div class="text-sm text-red-800">
                <p class="font-semibold">El vendedor no encontró tu pago (ref. {{ lastReport.reference }})</p>
                <p class="text-xs mt-0.5">"{{ lastReport.rejectionReason }}". Revisa los datos y repórtalo de nuevo.</p>
              </div>
            </div>
            <p v-if="session.priceChanged" class="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
              El precio cambió después de tu reporte. Si hay diferencia, acuérdala con el vendedor.
            </p>

            <!-- Pagar y reportar -->
            <template v-if="canReport">
              <div>
                <p class="text-xs font-medium text-gray-700 mb-2">1. Elige cómo pagar y copia los datos</p>
                <div class="space-y-2">
                  <label
                    v-for="acc in session.accounts"
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
                        Equivale a {{ formatPaymentAmount(session.intent.amount, session.intent.currency) }}
                        a {{ Number(acc.exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 4 }) }} {{ acc.currency }} por {{ session.intent.currency }}.
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
                <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
                <button type="submit" class="btn-primary w-full" :disabled="submitting || !selectedId">
                  {{ submitting ? 'Enviando…' : 'Reportar pago' }}
                </button>
                <p class="text-[11px] text-gray-400 text-center">
                  Reportar una referencia falsa puede suspender tu cuenta.
                </p>
              </form>
            </template>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import {
  useDirectPayments,
  formatPaymentAmount,
  DIRECT_PAYMENT_METHOD_LABELS,
  type DirectPaymentSession,
  type DirectPaymentSourceType,
  type PayableSellerAccount,
} from '~/composables/payments/useDirectPayments'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const props = defineProps<{
  show: boolean
  sourceType: DirectPaymentSourceType
  sourceId: string
  sellerName: string
}>()
const emit = defineEmits<{ close: []; reported: [] }>()

const { banks, loadBanks, startPayment, reportPayment } = useDirectPayments()

const session = ref<DirectPaymentSession | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const submitting = ref(false)
const formError = ref<string | null>(null)
const selectedId = ref('')
const copied = ref<string | null>(null)

// Fecha local (no UTC): en Venezuela, de noche, toISOString ya marca el día siguiente.
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = toDateInput(new Date())
// Mismo límite que el backend (PAID_AT_MAX_AGE_DAYS).
const minDate = toDateInput(new Date(Date.now() - 30 * 24 * 3600 * 1000))
const form = ref({ reference: '', paidAt: today, payerBankCode: '' })

const status = computed(() => session.value?.intent.status)
const canReport = computed(() => ['REQUIRES_ACTION', 'REQUIRES_RECONCILIATION'].includes(status.value ?? ''))
const lastReport = computed(() => session.value?.reports[0] ?? null)
const selectedAccount = computed(() => session.value?.accounts.find(a => a.id === selectedId.value) ?? null)

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

async function load() {
  loading.value = true
  loadError.value = null
  session.value = null
  try {
    const [data] = await Promise.all([startPayment(props.sourceType, props.sourceId), loadBanks().catch(() => [])])
    session.value = data
    selectedId.value = data.accounts.find(a => a.amount !== null)?.id ?? ''
  } catch (e) {
    loadError.value = getApiErrorMessage(e, 'No se pudo preparar el pago')
  } finally {
    loading.value = false
  }
}

async function submit() {
  formError.value = null
  const reference = form.value.reference.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9-]{4,30}$/.test(reference)) {
    formError.value = 'Escribe la referencia tal como aparece en tu comprobante (4 a 30 caracteres).'
    return
  }
  if (!form.value.paidAt) {
    formError.value = 'Indica la fecha del pago.'
    return
  }
  if (!session.value || !selectedId.value) return
  submitting.value = true
  try {
    // Mediodía local: evita que la zona horaria corra la fecha un día.
    const paidAt = new Date(`${form.value.paidAt}T12:00:00`)
    const effective = paidAt.getTime() > Date.now() ? new Date() : paidAt
    await reportPayment(session.value.intent.id, {
      sellerPaymentAccountId: selectedId.value,
      reference,
      paidAt: effective.toISOString(),
      payerBankCode: form.value.payerBankCode || undefined,
    })
    emit('reported')
    await load()
  } catch (e) {
    formError.value = getApiErrorMessage(e, 'No se pudo reportar el pago')
  } finally {
    submitting.value = false
  }
}

watch(() => props.show, (visible) => {
  if (!visible) return
  form.value = { reference: '', paidAt: today, payerBankCode: '' }
  formError.value = null
  load()
}, { immediate: true })
</script>
