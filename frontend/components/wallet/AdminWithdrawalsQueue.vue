<template>
  <div class="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-gray-900">Retiros solicitados</h2>
        <p class="text-sm text-gray-500">Transfiere a la cuenta indicada y marca el retiro como pagado con la referencia. Si rechazas, el saldo vuelve al usuario.</p>
      </div>
      <select v-model="status" class="input w-auto" @change="load">
        <option value="PENDING">Pendientes</option>
        <option value="PAID">Pagados</option>
        <option value="REJECTED">Rechazados</option>
      </select>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>
    <p v-else-if="!items.length" class="text-sm text-gray-500">No hay retiros en este estado.</p>

    <ul v-else class="divide-y divide-gray-100">
      <li v-for="w in items" :key="w.id" class="py-3 space-y-2">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-semibold text-gray-900">
              {{ Number(w.amount).toFixed(2) }} {{ w.currency }}
              <span class="font-normal text-gray-500">· {{ w.user?.firstName }} {{ w.user?.lastName }} ({{ w.user?.email }})</span>
            </p>
            <p class="text-xs text-gray-600 break-words">{{ describeDestination(w.destination) }} · Titular: {{ w.destination.holderName }}</p>
            <p class="text-xs text-gray-400">{{ new Date(w.createdAt).toLocaleString() }}</p>
            <p v-if="w.payoutReference" class="text-xs text-green-700">Referencia: {{ w.payoutReference }}</p>
            <p v-if="w.rejectionReason" class="text-xs text-gray-600">Motivo: {{ w.rejectionReason }}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="WITHDRAWAL_STATUS_CLASSES[w.status]">
            {{ WITHDRAWAL_STATUS_LABELS[w.status] }}
          </span>
        </div>
        <div v-if="w.status === 'PENDING'" class="flex flex-wrap gap-2">
          <input v-model="inputs[w.id]" type="text" class="input flex-1 min-w-[12rem]" placeholder="Referencia de la transferencia o motivo del rechazo">
          <button class="btn-primary text-sm" :disabled="busyId === w.id || !(inputs[w.id] ?? '').trim()" @click="pay(w)">Marcar pagado</button>
          <button class="btn-secondary text-sm" :disabled="busyId === w.id || !(inputs[w.id] ?? '').trim()" @click="rejectOne(w)">Rechazar</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  WITHDRAWAL_STATUS_CLASSES,
  WITHDRAWAL_STATUS_LABELS,
  describeDestination,
  useWalletWithdrawals,
  type WalletWithdrawal,
  type WithdrawalStatus,
} from '~/composables/wallets/useWalletWithdrawals'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const api = useWalletWithdrawals()
const status = ref<WithdrawalStatus>('PENDING')
const items = ref<WalletWithdrawal[]>([])
const inputs = reactive<Record<string, string>>({})
const loading = ref(false)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)

async function load() {
  loading.value = true; error.value = null
  try {
    items.value = (await api.listAll(status.value, 1, 50)).data
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar los retiros')
  } finally { loading.value = false }
}

async function run(w: WalletWithdrawal, fn: () => Promise<unknown>) {
  busyId.value = w.id; error.value = null
  try { await fn(); await load() } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo procesar el retiro')
  } finally { busyId.value = null }
}

const pay = (w: WalletWithdrawal) => run(w, () => api.markPaid(w.id, inputs[w.id]!.trim()))
const rejectOne = (w: WalletWithdrawal) => run(w, () => api.reject(w.id, inputs[w.id]!.trim()))

onMounted(load)
</script>
