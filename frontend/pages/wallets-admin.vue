<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">

    <PageHeader
      title="Billeteras"
      description="Congela, descongela o ajusta el saldo de cualquier billetera."
      :icon="BanknotesIcon"
      :breadcrumb="[{ label: 'Billeteras' }]"
      :stats="headerStats"
    />

    <!-- Reconciliación de escrow: saldo real de la wallet de plataforma vs. lo
         que debería haber retenido según las solicitudes con garantía activa -->
    <div
      v-if="reconciliation"
      class="rounded-2xl border p-5"
      :class="reconciliation.isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
    >
      <div class="flex items-start gap-3">
        <component :is="reconciliation.isBalanced ? CheckCircleIcon : ExclamationTriangleIcon"
          class="h-5 w-5 flex-shrink-0 mt-0.5" :class="reconciliation.isBalanced ? 'text-green-600' : 'text-red-600'" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold" :class="reconciliation.isBalanced ? 'text-green-800' : 'text-red-800'">
            {{ reconciliation.isBalanced ? 'Escrow cuadrado' : 'Descuadre detectado en escrow' }}
          </p>
          <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p class="text-gray-500">Saldo real (wallet plataforma)</p>
              <p class="font-bold text-gray-900">${{ reconciliation.systemWalletBalance.toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-gray-500">Retenido esperado ({{ reconciliation.heldCount }} solicitudes)</p>
              <p class="font-bold text-gray-900">${{ reconciliation.heldTotal.toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-gray-500">Diferencia</p>
              <p class="font-bold" :class="reconciliation.isBalanced ? 'text-green-700' : 'text-red-700'">
                ${{ reconciliation.discrepancy.toFixed(2) }}
              </p>
            </div>
            <div v-if="reconciliation.pendingFundsCount > 0">
              <p class="text-gray-500">Pendientes de fondos ({{ reconciliation.pendingFundsCount }})</p>
              <p class="font-bold text-amber-700">${{ reconciliation.pendingFundsTotal.toFixed(2) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <div v-else class="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
      <div v-for="w in items" :key="w.id" class="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-bold text-gray-900 truncate">{{ w.user?.firstName }} {{ w.user?.lastName }}</p>
          <p class="text-xs text-gray-400 truncate">{{ w.user?.email }} · {{ w.user?.role }}</p>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <span class="text-sm font-bold text-gray-900">{{ formatMoney(w.balance, w.currency) }}</span>
          <span class="badge" :class="STATUS_CLASSES[w.status]">{{ STATUS_LABELS[w.status] }}</span>
          <button
            class="text-xs font-semibold text-workplace-red hover:underline"
            @click="openDetail(w)"
          >
            Gestionar
          </button>
        </div>
      </div>
      <div v-if="items.length === 0" class="px-6 py-12 text-center text-sm text-gray-500">No hay billeteras registradas.</div>
    </div>

    <div v-if="meta.totalPages > 1" class="flex items-center justify-center gap-2">
      <button class="btn-secondary text-xs" :disabled="meta.page <= 1" @click="load(meta.page - 1)">Anterior</button>
      <span class="text-xs text-gray-500">Página {{ meta.page }} de {{ meta.totalPages }}</span>
      <button class="btn-secondary text-xs" :disabled="meta.page >= meta.totalPages" @click="load(meta.page + 1)">Siguiente</button>
    </div>

    <!-- Modal de gestión -->
    <Teleport to="body">
      <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="selected = null" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-gray-900">{{ selected.user?.firstName }} {{ selected.user?.lastName }}</h3>
              <p class="text-xs text-gray-400">{{ formatMoney(selected.balance, selected.currency) }} · {{ STATUS_LABELS[selected.status] }}</p>
            </div>
            <button class="text-gray-400 hover:text-gray-600" @click="selected = null"><XMarkIcon class="h-5 w-5" /></button>
          </div>

          <div class="flex gap-2">
            <button
              v-if="!selected.frozenAt"
              class="flex-1 px-3 py-2 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50 disabled:opacity-60"
              :disabled="actionLoading"
              @click="doFreeze"
            >
              Congelar billetera
            </button>
            <button
              v-else
              class="flex-1 px-3 py-2 border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50 disabled:opacity-60"
              :disabled="actionLoading"
              @click="doUnfreeze"
            >
              Descongelar billetera
            </button>
          </div>

          <div class="border-t border-gray-100 pt-4 space-y-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ajuste manual de saldo</p>
            <div class="flex gap-2">
              <select v-model="adjustType" class="input flex-shrink-0 w-28">
                <option value="CREDIT">Acreditar</option>
                <option value="DEBIT">Debitar</option>
              </select>
              <input v-model.number="adjustAmount" type="number" min="0.01" step="0.01" placeholder="Monto" class="input flex-1" />
            </div>
            <input v-model="adjustDescription" type="text" placeholder="Motivo del ajuste (obligatorio)" class="input w-full" />

            <div v-if="confirmingAdjust" class="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
              <p class="text-xs text-amber-800 font-medium">
                ¿Confirmas {{ adjustType === 'CREDIT' ? 'acreditar' : 'debitar' }}
                <strong>{{ formatMoney(adjustAmount ?? 0, selected.currency) }}</strong>
                {{ adjustType === 'CREDIT' ? 'a' : 'de' }} la billetera de
                <strong>{{ selected.user?.firstName }} {{ selected.user?.lastName }}</strong>?
              </p>
              <div class="flex justify-end gap-2">
                <button class="btn-secondary text-xs py-1.5 px-3" :disabled="actionLoading" @click="confirmingAdjust = false">Cancelar</button>
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-workplace-red text-white hover:bg-red-700 disabled:opacity-60"
                  :disabled="actionLoading"
                  @click="doAdjust"
                >
                  {{ actionLoading ? 'Procesando…' : 'Sí, aplicar ajuste' }}
                </button>
              </div>
            </div>
            <button
              v-else
              class="w-full px-3 py-2 bg-workplace-red hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60"
              :disabled="actionLoading || !adjustAmount || !adjustDescription.trim()"
              @click="confirmingAdjust = true"
            >
              Aplicar ajuste
            </button>
          </div>

          <p v-if="actionError" class="text-xs text-red-600">{{ actionError }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, computed, onMounted } from 'vue'
import { BanknotesIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { useWallets, type Wallet, type EscrowReconciliation } from '~/composables/wallets/useWallets'
import PageHeader from '~/components/ui/PageHeader.vue'

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts (ADMIN_ONLY_ROUTES)
const {
  fetchWallets, freezeUserWallet, unfreezeUserWallet, adjustUserBalance,
  fetchEscrowReconciliation,
  formatMoney, STATUS_LABELS, STATUS_CLASSES,
} = useWallets()

const items = ref<Wallet[]>([])
const loading = ref(true)
const meta = ref({ page: 1, totalPages: 1 })
const reconciliation = ref<EscrowReconciliation | null>(null)

const headerStats = computed(() => [{ label: 'Billeteras', value: items.value.length }])

async function load(page = 1) {
  loading.value = true
  try {
    const res = await fetchWallets(page, 20)
    items.value = res.data
    meta.value = { page: res.page, totalPages: res.totalPages }
  } finally {
    loading.value = false
  }
}

async function loadReconciliation() {
  try {
    reconciliation.value = await fetchEscrowReconciliation()
  } catch {
    // no bloquea el resto del panel si esto falla
  }
}

const selected = ref<Wallet | null>(null)
const actionLoading = ref(false)
const actionError = ref('')
const adjustType = ref<'CREDIT' | 'DEBIT'>('CREDIT')
const adjustAmount = ref<number | undefined>(undefined)
const adjustDescription = ref('')
const confirmingAdjust = ref(false)

function openDetail(w: Wallet) {
  selected.value = w
  actionError.value = ''
  adjustType.value = 'CREDIT'
  adjustAmount.value = undefined
  adjustDescription.value = ''
  confirmingAdjust.value = false
}

async function doFreeze() {
  if (!selected.value) return
  actionLoading.value = true; actionError.value = ''
  try {
    const updated = await freezeUserWallet(selected.value.userId)
    applyUpdate(updated)
  } catch (e: any) { actionError.value = e?.data?.message ?? e?.message ?? 'Error al congelar' }
  finally { actionLoading.value = false }
}

async function doUnfreeze() {
  if (!selected.value) return
  actionLoading.value = true; actionError.value = ''
  try {
    const updated = await unfreezeUserWallet(selected.value.userId)
    applyUpdate(updated)
  } catch (e: any) { actionError.value = e?.data?.message ?? e?.message ?? 'Error al descongelar' }
  finally { actionLoading.value = false }
}

async function doAdjust() {
  if (!selected.value || !adjustAmount.value || !adjustDescription.value.trim()) return
  actionLoading.value = true; actionError.value = ''
  try {
    const { wallet } = await adjustUserBalance(selected.value.userId, adjustType.value, adjustAmount.value, adjustDescription.value.trim())
    applyUpdate(wallet)
    adjustAmount.value = undefined
    adjustDescription.value = ''
    confirmingAdjust.value = false
  } catch (e: any) { actionError.value = e?.data?.message ?? e?.message ?? 'Error al ajustar el saldo' }
  finally { actionLoading.value = false }
}

function applyUpdate(updated: Wallet) {
  selected.value = { ...selected.value!, ...updated }
  const idx = items.value.findIndex(i => i.id === selected.value!.id)
  if (idx !== -1) items.value[idx] = { ...items.value[idx], ...updated }
}

onMounted(() => { load(); loadReconciliation() })
</script>
