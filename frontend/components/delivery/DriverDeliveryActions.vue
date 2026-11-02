<template>
  <div class="card p-4 space-y-3">
    <div class="flex items-center justify-between gap-2">
      <span class="badge" :class="DELIVERY_STATUS_CLASSES[delivery.status]">{{ DELIVERY_STATUS_LABELS[delivery.status] }}</span>
      <a v-if="delivery.customerPhone" :href="`tel:${delivery.customerPhone}`" class="text-sm font-semibold text-blue-600 hover:underline">
        📞 Llamar a {{ delivery.customerName }}
      </a>
    </div>
    <p class="text-sm text-gray-600">
      {{ delivery.deliveryAddress }}
      <span v-if="delivery.notes" class="block text-xs text-gray-400 mt-0.5">Nota: {{ delivery.notes }}</span>
    </p>
    <p class="text-sm">
      Total del pedido: <strong>{{ money(Number(delivery.total) + Number(delivery.deliveryFee ?? 0)) }}</strong>
    </p>

    <!-- Entregar: código del cliente + cómo se pagó -->
    <form v-if="mode === 'deliver'" class="space-y-2 rounded-xl bg-gray-50 p-3" @submit.prevent="submitDeliver">
      <label v-if="delivery.hasDeliveryCode" class="block text-xs font-medium text-gray-700">
        Código que te da el cliente
        <input v-model="code" inputmode="numeric" maxlength="4" class="input-field mt-1 font-mono tracking-[0.4em] text-center text-lg" placeholder="0000" />
      </label>
      <div class="grid grid-cols-1 gap-1.5">
        <label v-for="(label, value) in DELIVERY_COLLECTION_LABELS" :key="value" class="flex items-center gap-2 text-sm">
          <input v-model="method" type="radio" :value="value" class="text-emerald-600" />
          {{ label }}
        </label>
      </div>
      <label v-if="method && method !== 'PREPAID'" class="block text-xs font-medium text-gray-700">
        ¿Cuánto cobraste?
        <input v-model.number="amount" type="number" min="0" step="0.01" class="input-field mt-1" />
      </label>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary text-sm" :disabled="saving" @click="mode = null">Volver</button>
        <button type="submit" class="btn-primary text-sm" :disabled="saving">{{ saving ? 'Guardando…' : 'Confirmar entrega' }}</button>
      </div>
    </form>

    <!-- No se pudo entregar -->
    <form v-else-if="mode === 'fail'" class="space-y-2 rounded-xl bg-red-50 p-3" @submit.prevent="submitFail">
      <textarea v-model="reason" rows="2" maxlength="300" class="input-field resize-none" placeholder="Ej. El cliente no estaba y no contesta" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary text-sm" :disabled="saving" @click="mode = null">Volver</button>
        <button type="submit" class="px-3 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60" :disabled="saving">Marcar como no entregada</button>
      </div>
    </form>

    <div v-else class="flex flex-wrap gap-2">
      <button v-if="delivery.status === 'ASSIGNED'" class="btn-primary text-sm flex-1" :disabled="saving" @click="advance('PICKING_UP')">
        Voy a recoger
      </button>
      <button v-if="delivery.status === 'PICKING_UP'" class="btn-primary text-sm flex-1" :disabled="saving" @click="advance('IN_TRANSIT')">
        Recogido, voy en camino
      </button>
      <button v-if="delivery.status === 'IN_TRANSIT'" class="btn-primary text-sm flex-1" :disabled="saving" @click="openDeliver">
        Entregado
      </button>
      <button class="btn-secondary text-sm" :disabled="saving" @click="openFail">No se pudo entregar</button>
      <p v-if="error" class="w-full text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  DELIVERY_COLLECTION_LABELS,
  DELIVERY_STATUS_CLASSES,
  DELIVERY_STATUS_LABELS,
  type Delivery,
  type DeliveryCollectionMethod,
  type DeliveryStatus,
} from '~/composables/delivery/useDelivery'
import { useDriverDeliveries, type DriverStatusUpdate } from '~/composables/delivery/useDriverDeliveries'
import { formatPaymentAmount } from '~/composables/payments/useDirectPayments'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const props = defineProps<{ delivery: Delivery }>()
const emit = defineEmits<{ updated: [Delivery] }>()

const { updateStatus } = useDriverDeliveries()
const mode = ref<'deliver' | 'fail' | null>(null)
const code = ref('')
const method = ref<DeliveryCollectionMethod | null>(null)
const amount = ref<number | null>(null)
const reason = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

const money = (v: number) => formatPaymentAmount(v, 'USD')

async function send(payload: DriverStatusUpdate) {
  saving.value = true
  error.value = null
  try {
    const updated = await updateStatus(props.delivery.id, payload)
    mode.value = null
    emit('updated', updated)
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo actualizar la entrega')
  } finally {
    saving.value = false
  }
}

const advance = (status: DeliveryStatus) => send({ status })

function openDeliver() {
  mode.value = 'deliver'
  code.value = ''
  method.value = null
  amount.value = Number(props.delivery.total) + Number(props.delivery.deliveryFee ?? 0)
  error.value = null
}

function openFail() {
  mode.value = 'fail'
  reason.value = ''
  error.value = null
}

function submitDeliver() {
  if (props.delivery.hasDeliveryCode && !/^\d{4}$/.test(code.value)) {
    error.value = 'Pídele al cliente su código de 4 dígitos'
    return
  }
  if (!method.value) {
    error.value = 'Indica cómo se pagó el pedido'
    return
  }
  send({
    status: 'DELIVERED',
    deliveryCode: props.delivery.hasDeliveryCode ? code.value : undefined,
    collectedMethod: method.value,
    amountCollected: method.value === 'PREPAID' ? undefined : Number(amount.value ?? 0),
  })
}

function submitFail() {
  if (reason.value.trim().length < 5) {
    error.value = 'Explica brevemente qué pasó'
    return
  }
  send({ status: 'FAILED', failureReason: reason.value.trim() })
}
</script>
