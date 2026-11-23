<template>
  <div class="space-y-4">
    <div class="card divide-y divide-gray-100">
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4">
          <div class="skeleton h-4 w-48 rounded flex-1" />
          <div class="skeleton h-6 w-20 rounded" />
        </div>
      </template>

      <div v-else-if="rows.length === 0" class="p-12 text-center">
        <BookOpenIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">Nadie te debe por ahora</p>
        <p class="text-xs text-gray-400 mt-1">Cuando fíes a un cliente, aquí verás cuánto debe y desde cuándo.</p>
        <button class="btn-primary mt-4 text-sm" @click="$emit('create')">Registrar fiado</button>
      </div>

      <template v-else>
        <div
          v-for="row in rows"
          :key="row.customer?.id ?? 'sin-cliente'"
          class="p-4 flex flex-wrap items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <button
            class="flex-1 min-w-[10rem] text-left"
            :disabled="!row.customer"
            @click="row.customer && $emit('open', row.customer.id)"
          >
            <p class="font-medium text-gray-900 truncate">
              {{ row.customer?.name ?? 'Sin cliente asociado' }}
              <span v-if="row.overLimit" class="ml-1 badge bg-red-100 text-red-700">Pasó su tope</span>
            </p>
            <p class="text-sm text-gray-500">
              {{ row.openCount }} {{ row.openCount === 1 ? 'cuenta' : 'cuentas' }} · debe desde hace {{ daysAgo(row.oldestOpenAt) }}
              <template v-if="row.lastPaymentAt"> · último abono hace {{ daysAgo(row.lastPaymentAt) }}</template>
            </p>
          </button>

          <div class="text-right flex-shrink-0">
            <p class="font-semibold text-gray-900">${{ fmt(row.balanceUsd) }}</p>
            <p v-if="vesPerUsd" class="text-xs text-gray-400">≈ Bs {{ fmt(row.balanceUsd * vesPerUsd) }}</p>
            <p v-if="row.customer?.creditLimitUsd != null" class="text-xs text-gray-400">
              tope ${{ fmt(row.customer.creditLimitUsd) }}
            </p>
          </div>

          <a
            v-if="row.customer"
            :href="reminderUrl(row)"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
            :title="row.customer.phone ? 'Abre tu WhatsApp con el mensaje listo' : 'Sin teléfono: elige el contacto en WhatsApp'"
          >
            <ChatBubbleLeftEllipsisIcon class="h-4 w-4" />
            Recordar
          </a>
        </div>
      </template>
    </div>
    <p class="text-xs text-gray-400">
      Los saldos están en dólares a la tasa del día de cada venta. El recordatorio lo envías tú desde tu WhatsApp.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { BookOpenIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/vue/24/outline'
import type { LedgerRow } from '~/composables/commerce/useAccounts'
import { useDualPrice } from '~/composables/catalog/useDualPrice'
import { useAuth } from '~/composables/auth/useAuth'
import { fiadoReminderText, fiadoReminderUrl } from '~/utils/fiadoReminder'

defineProps<{ rows: LedgerRow[]; loading: boolean }>()
defineEmits<{ create: []; open: [customerId: string] }>()

const { loadRate, vesPerUsd } = useDualPrice()
const { commerce } = useAuth()
onMounted(() => { loadRate() })

const fmt = (n: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

function daysAgo(iso: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
  if (days === 0) return 'hoy'
  return days === 1 ? '1 día' : `${days} días`
}

function reminderUrl(row: LedgerRow) {
  const text = fiadoReminderText({
    customerName: row.customer?.name ?? '',
    commerceName: commerce.value?.name,
    balanceUsd: row.balanceUsd,
    vesPerUsd: vesPerUsd.value,
  })
  return fiadoReminderUrl(row.customer?.phone, text)
}
</script>

<style scoped>
.badge { @apply inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium; }
.skeleton { @apply bg-gray-200 animate-pulse; }
</style>
