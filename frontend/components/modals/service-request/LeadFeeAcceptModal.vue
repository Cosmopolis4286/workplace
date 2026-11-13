<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 class="font-black text-gray-900 text-lg">Aceptar solicitud</h3>

        <p v-if="loading" class="text-sm text-gray-500">Calculando el cargo…</p>

        <template v-else-if="quote">
          <p class="text-sm text-gray-600">
            Al aceptar, esta oportunidad se cobra en créditos de uso. Revisa los importes antes de continuar.
          </p>

          <dl class="rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
            <div class="flex justify-between px-4 py-2.5">
              <dt class="text-gray-600">Cargo por oportunidad (ahora)</dt>
              <dd class="font-bold text-gray-900">{{ fmt(quote.leadFee) }}</dd>
            </div>
            <div class="flex justify-between px-4 py-2.5">
              <dt class="text-gray-600">
                Comisión estimada (al cerrar)
                <span v-if="quote.commissionRate !== null" class="text-gray-400">· {{ pct(quote.commissionRate) }}</span>
              </dt>
              <dd class="font-bold text-gray-900">{{ fmt(quote.estimatedCommission) }}</dd>
            </div>
            <div class="flex justify-between px-4 py-2.5 bg-gray-50">
              <dt class="font-semibold text-gray-700">Total estimado</dt>
              <dd class="font-black text-gray-900">{{ fmt(quote.total) }}</dd>
            </div>
            <div class="flex justify-between px-4 py-2.5">
              <dt class="text-gray-600">Tus créditos</dt>
              <dd class="font-bold" :class="quote.enough ? 'text-green-700' : 'text-red-600'">{{ fmt(quote.available) }}</dd>
            </div>
          </dl>

          <p class="text-xs text-gray-500">
            La comisión se calcula con el precio final y se descuenta cuando el cliente confirma el servicio.
            <template v-if="quote.basePrice === null"> Todavía no hay precio: la estimación es 0.</template>
          </p>

          <div v-if="!quote.enough" class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            No te alcanzan los créditos para esta solicitud.
            <NuxtLink to="/credits" class="font-semibold underline" @click="close">Comprar créditos</NuxtLink>
          </div>

          <label v-else class="flex items-start gap-2 text-sm text-gray-700">
            <input v-model="consent" type="checkbox" class="mt-0.5 rounded border-gray-300">
            <span>Acepto que se descuenten {{ fmt(quote.leadFee) }} ahora y la comisión al cerrar.</span>
          </label>
        </template>

        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

        <div class="flex gap-3 pt-1">
          <button class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm" @click="close">
            Cancelar
          </button>
          <button
            v-if="quote?.enough"
            :disabled="!consent || accepting"
            class="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm"
            @click="accept"
          >
            {{ accepting ? 'Aceptando…' : 'Aceptar y descontar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorCode, getApiErrorMessage } from '~/composables/core/useApiErrors'

interface LeadFeeQuote {
  serviceRequestId: string
  status: 'PENDING' | 'SEEN'
  policyVersion: string
  basePrice: number | null
  leadFee: number
  commissionRate: number | null
  estimatedCommission: number
  total: number
  available: number
  enough: boolean
}

const props = defineProps<{ modelValue: boolean; requestId: string }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  accepted: [Record<string, unknown>]
}>()

const { get, post } = useApi()
const quote = ref<LeadFeeQuote | null>(null)
const loading = ref(false)
const accepting = ref(false)
const consent = ref(false)
const error = ref('')

// 1 crédito = 1 USD.
const fmt = (n: number) => `${n.toFixed(2)} créditos`
const pct = (rate: number) => `${(rate * 100).toFixed(rate * 100 % 1 ? 1 : 0)} %`

async function loadQuote() {
  loading.value = true
  error.value = ''
  consent.value = false
  try {
    quote.value = await get<LeadFeeQuote>(`/services/requests/${props.requestId}/lead-fee-quote`)
  } catch (e: unknown) {
    quote.value = null
    error.value = getApiErrorMessage(e, 'No se pudo calcular el cargo')
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (open) => { if (open) loadQuote() }, { immediate: true })

function close() {
  emit('update:modelValue', false)
}

async function accept() {
  if (!quote.value || !consent.value || accepting.value) return
  accepting.value = true
  error.value = ''
  try {
    const updated = await post<Record<string, unknown>>(`/services/requests/${props.requestId}/accept`, {
      policyVersion: quote.value.policyVersion,
      leadFee: quote.value.leadFee,
    })
    emit('accepted', updated)
    close()
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'No se pudo aceptar la solicitud')
    // El cargo cambió o el saldo ya no alcanza: se muestra la cotización nueva.
    const code = getApiErrorCode(e)
    if (code === 'LEAD_FEE_QUOTE_CHANGED' || code === 'USAGE_CREDITS_INSUFFICIENT') {
      const msg = error.value
      await loadQuote()
      error.value = msg
    }
  } finally {
    accepting.value = false
  }
}
</script>
