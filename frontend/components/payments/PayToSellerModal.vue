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
            <PaymentReportForm
              v-if="canReport"
              :accounts="session.accounts"
              :base-amount="session.intent.amount"
              :base-currency="session.intent.currency"
              :banks="banks"
              :submitting="submitting"
              :error="formError"
              @submit="submit"
            />
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
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import PaymentReportForm, { type PaymentReportPayload } from './PaymentReportForm.vue'
import {
  useDirectPayments,
  formatPaymentAmount,
  type DirectPaymentSession,
  type DirectPaymentSourceType,
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

const status = computed(() => session.value?.intent.status)
const canReport = computed(() => ['REQUIRES_ACTION', 'REQUIRES_RECONCILIATION'].includes(status.value ?? ''))
const lastReport = computed(() => session.value?.reports[0] ?? null)

async function load() {
  loading.value = true
  loadError.value = null
  session.value = null
  try {
    const [data] = await Promise.all([startPayment(props.sourceType, props.sourceId), loadBanks().catch(() => [])])
    session.value = data
  } catch (e) {
    loadError.value = getApiErrorMessage(e, 'No se pudo preparar el pago')
  } finally {
    loading.value = false
  }
}

async function submit(payload: PaymentReportPayload) {
  if (!session.value) return
  formError.value = null
  submitting.value = true
  try {
    await reportPayment(session.value.intent.id, {
      sellerPaymentAccountId: payload.accountId,
      reference: payload.reference,
      paidAt: payload.paidAt,
      payerBankCode: payload.payerBankCode,
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
  formError.value = null
  load()
}, { immediate: true })
</script>
