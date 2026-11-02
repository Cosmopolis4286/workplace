<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="!submitting && $emit('close')" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheckIcon class="h-5 w-5" />
            </div>
            <div>
              <h3 class="font-black text-gray-900">Pagar garantía</h3>
              <p class="text-xs text-gray-500 mt-0.5">
                Pago Protegido: la plataforma guarda el dinero y se lo paga a {{ options?.providerName || 'el proveedor' }}
                cuando confirmes que el servicio se completó.
              </p>
            </div>
          </div>
          <button class="p-1 text-gray-400 hover:text-gray-600" :disabled="submitting" @click="$emit('close')">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 2" :key="i" class="skeleton h-14 rounded-xl" />
          </div>

          <p v-else-if="loadError" class="text-sm text-red-700 bg-red-50 rounded-lg p-3">{{ loadError }}</p>

          <div v-else-if="options?.held" class="text-sm text-emerald-800 bg-emerald-50 rounded-lg p-4">
            Tu saldo ya cubría la garantía: quedó retenida y la solicitud puede continuar.
          </div>

          <div v-else-if="options?.pendingReport" class="text-sm text-amber-800 bg-amber-50 rounded-lg p-4">
            Reportaste un pago de {{ formatPaymentAmount(options.pendingReport.paidAmount, options.pendingReport.paidCurrency) }}
            (ref. <span class="font-mono font-semibold">{{ options.pendingReport.reference }}</span>).
            Un administrador lo está verificando; te avisaremos cuando la garantía quede retenida.
          </div>

          <template v-else-if="options">
            <div class="rounded-xl bg-gray-50 p-4 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Garantía {{ options.serviceName ? `de "${options.serviceName}"` : '' }}</span>
                <span class="font-semibold text-gray-900">{{ formatPaymentAmount(options.required, 'USD') }}</span>
              </div>
              <div v-if="Number(options.walletBalance) > 0" class="flex justify-between mt-1">
                <span class="text-gray-500">Saldo de tu billetera</span>
                <span class="text-gray-700">−{{ formatPaymentAmount(Math.min(Number(options.walletBalance), Number(options.required)), 'USD') }}</span>
              </div>
              <div class="flex justify-between mt-2 pt-2 border-t border-gray-200">
                <span class="font-semibold text-gray-900">A pagar</span>
                <span class="font-black text-gray-900">{{ formatPaymentAmount(options.amountDue, 'USD') }}</span>
              </div>
            </div>
            <p v-if="options.lastRejected" class="text-xs text-red-600">
              Tu pago anterior (ref. {{ options.lastRejected.reference }}) no se encontró: "{{ options.lastRejected.rejectionReason }}"
            </p>
            <PaymentReportForm
              :accounts="options.accounts"
              :base-amount="Number(options.amountDue)"
              base-currency="USD"
              :banks="banks"
              :submitting="submitting"
              :error="submitError"
              @submit="submit"
            />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ShieldCheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PaymentReportForm, { type PaymentReportPayload } from '~/components/payments/PaymentReportForm.vue'
import { useEscrowFunding, type EscrowFundingOptions } from '~/composables/payments/useEscrowFunding'
import { useDirectPayments, formatPaymentAmount } from '~/composables/payments/useDirectPayments'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const props = defineProps<{ requestId: string }>()
const emit = defineEmits<{ close: []; held: [] }>()

const { getServiceRequestOptions, reportServiceRequestPayment } = useEscrowFunding()
const { banks, loadBanks } = useDirectPayments()

const options = ref<EscrowFundingOptions | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const submitting = ref(false)
const submitError = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const [opts] = await Promise.all([getServiceRequestOptions(props.requestId), loadBanks().catch(() => [])])
    options.value = opts
    if (opts.held) emit('held')
  } catch (e) {
    loadError.value = getApiErrorMessage(e, 'No se pudo cargar el pago de la garantía')
  } finally {
    loading.value = false
  }
}

async function submit(payload: PaymentReportPayload) {
  submitting.value = true
  submitError.value = null
  try {
    await reportServiceRequestPayment(props.requestId, {
      platformAccountId: payload.accountId,
      reference: payload.reference,
      paidAt: payload.paidAt,
      payerBankCode: payload.payerBankCode,
    })
    await load()
  } catch (e) {
    submitError.value = getApiErrorMessage(e, 'No se pudo reportar el pago')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>
