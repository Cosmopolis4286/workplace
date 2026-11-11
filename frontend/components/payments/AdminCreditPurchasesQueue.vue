<template>
  <div class="space-y-3">
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>
    <p v-else-if="!items.length" class="text-sm text-gray-500">No hay compras de créditos por verificar.</p>
    <div v-for="p in items" :key="p.id" class="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="font-semibold text-gray-900">
            {{ Number(p.units).toFixed(2) }} créditos · ${{ Number(p.priceUsd).toFixed(2) }}
          </p>
          <p class="text-xs text-gray-500">
            {{ p.user?.firstName }} {{ p.user?.lastName }} ({{ p.user?.email }})
          </p>
          <p class="text-xs text-gray-600">
            Ref. {{ p.reference }} · pagó {{ Number(p.paidAmount).toFixed(2) }} {{ p.paidCurrency }} ·
            {{ new Date(p.createdAt).toLocaleString('es-VE') }}
          </p>
        </div>
      </div>
      <p class="text-xs text-gray-500">Verifica el pago en la cuenta de la plataforma antes de acreditar.</p>
      <div class="flex flex-wrap gap-2">
        <button class="btn-primary text-sm" :disabled="busyId === p.id" @click="confirmOne(p)">Acreditar</button>
        <input v-model="reasons[p.id]" class="input flex-1 min-w-[12rem]" placeholder="Motivo del rechazo">
        <button class="btn-secondary text-sm" :disabled="busyId === p.id || (reasons[p.id] ?? '').trim().length < 5" @click="rejectOne(p)">
          Rechazar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { useUsageCredits, type UsageCreditPurchase } from '~/composables/payments/useUsageCredits'

const credits = useUsageCredits()
const items = ref<UsageCreditPurchase[]>([])
const reasons = reactive<Record<string, string>>({})
const loading = ref(false)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = await credits.listPurchases('SUBMITTED')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar las compras')
  } finally {
    loading.value = false
  }
}

async function run(p: UsageCreditPurchase, fn: () => Promise<unknown>) {
  busyId.value = p.id
  error.value = null
  try {
    await fn()
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo procesar la compra')
  } finally {
    busyId.value = null
  }
}

const confirmOne = (p: UsageCreditPurchase) => run(p, () => credits.confirmPurchase(p.id))
const rejectOne = (p: UsageCreditPurchase) => run(p, () => credits.rejectPurchase(p.id, reasons[p.id]!.trim()))

onMounted(load)
</script>
