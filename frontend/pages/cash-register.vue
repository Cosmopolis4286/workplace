<template>
  <div>
    <PageHeader
      title="Caja"
      description="Apertura, arqueo y cierre de caja registradora"
      :icon="BanknotesIcon"
      :breadcrumb="breadcrumbItems"
    />

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !current" class="card p-8 text-center">
      <div class="skeleton h-8 w-48 mx-auto rounded mb-4" />
      <div class="skeleton h-4 w-64 mx-auto rounded" />
    </div>

    <!-- No session open: prompt to open -->
    <div v-else-if="!isOpen" class="card p-8 max-w-md mx-auto text-center">
      <BanknotesIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <h2 class="text-lg font-semibold text-gray-900 mb-1">No hay una caja abierta</h2>
      <p class="text-sm text-gray-500 mb-6">Registra el monto inicial en efectivo para comenzar el turno.</p>

      <form class="space-y-4 text-left" @submit.prevent="handleOpen">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Monto inicial</label>
          <input
            v-model.number="openForm.openingAmount"
            type="number"
            min="0"
            step="0.01"
            required
            class="input-field"
            placeholder="0.00"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <input v-model="openForm.notes" type="text" class="input-field" placeholder="Ej. Cambio inicial del turno" />
        </div>
        <button type="submit" class="btn-primary w-full" :disabled="loadingAction">
          {{ loadingAction ? 'Abriendo...' : 'Abrir caja' }}
        </button>
      </form>
    </div>

    <!-- Session open: live panel -->
    <div v-else class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <span class="badge" :class="CASH_STATUS_CLASSES.OPEN">Caja abierta</span>
          <p class="text-sm text-gray-500 mt-1">
            Abierta por {{ current!.openedBy }} · {{ formatDateTime(current!.openedAt) }}
          </p>
        </div>
        <div class="flex gap-2">
          <button class="btn-secondary text-sm" @click="showMovementModal = true">Registrar movimiento</button>
          <button class="btn-primary text-sm" @click="showCloseModal = true">Cerrar caja</button>
        </div>
      </div>

      <!-- Live summary cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card p-5">
          <p class="text-sm text-gray-500">Monto inicial</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ formatCurrency(current!.openingAmount) }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-gray-500">Ventas en efectivo</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{{ formatCurrency(current!.cashSalesTotal) }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ current!.cashSalesCount }} pedido(s)</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-gray-500">Movimientos</p>
          <p class="text-lg font-semibold text-gray-900 mt-1">
            <span class="text-green-600">+{{ formatCurrency(current!.manualIncome) }}</span>
            <span class="text-gray-300 mx-1">/</span>
            <span class="text-red-600">-{{ formatCurrency(current!.manualWithdrawals) }}</span>
          </p>
        </div>
        <div class="card p-5 border-2 border-indigo-200 bg-indigo-50/50">
          <p class="text-sm text-indigo-700">Esperado en caja</p>
          <p class="text-2xl font-bold text-indigo-700 mt-1">{{ formatCurrency(current!.expectedAmount ?? 0) }}</p>
        </div>
      </div>

      <!-- Movements list -->
      <div class="card">
        <div class="p-4 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700">Movimientos del turno</h3>
        </div>
        <div v-if="!current!.movements?.length" class="p-8 text-center text-sm text-gray-400">
          Sin movimientos registrados todavía.
        </div>
        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="m in current!.movements"
            :key="m.id"
            class="p-4 flex items-center justify-between"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">{{ m.reason }}</p>
              <p class="text-xs text-gray-400">{{ formatDateTime(m.createdAt) }}</p>
            </div>
            <p class="font-semibold" :class="m.type === 'INCOME' ? 'text-green-600' : 'text-red-600'">
              {{ m.type === 'INCOME' ? '+' : '-' }}{{ formatCurrency(m.amount) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- History -->
    <div class="card mt-6">
      <div class="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700">Historial de cierres</h3>
      </div>
      <div v-if="loadingHistory" class="p-4 space-y-3">
        <div v-for="i in 3" :key="i" class="skeleton h-12 rounded" />
      </div>
      <div v-else-if="closedSessions.length === 0" class="p-8 text-center text-sm text-gray-400">
        Aún no hay cierres registrados.
      </div>
      <div v-else class="divide-y divide-gray-100">
        <div v-for="s in closedSessions" :key="s.id" class="p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900">
              {{ formatDateTime(s.openedAt) }} → {{ formatDateTime(s.closedAt!) }}
            </p>
            <p class="text-xs text-gray-400">{{ s.openedBy }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-600">
              Esperado {{ formatCurrency(s.expectedAmount ?? 0) }} · Contado {{ formatCurrency(s.countedAmount ?? 0) }}
            </p>
            <p
              class="text-sm font-semibold"
              :class="(s.difference ?? 0) === 0 ? 'text-gray-500' : (s.difference ?? 0) > 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ (s.difference ?? 0) === 0 ? 'Cuadrada' : (s.difference ?? 0) > 0 ? `Sobrante ${formatCurrency(s.difference!)}` : `Faltante ${formatCurrency(Math.abs(s.difference!))}` }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Movement modal -->
    <TransitionRoot appear :show="showMovementModal" as="template">
      <Dialog as="div" class="relative z-50" @close="showMovementModal = false">
        <div class="fixed inset-0 bg-black/25" />
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <DialogTitle class="text-lg font-semibold text-gray-900 mb-4">Registrar movimiento</DialogTitle>
            <form class="space-y-4" @submit.prevent="handleAddMovement">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 py-2 rounded-lg text-sm font-medium border"
                  :class="movementForm.type === 'INCOME' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500'"
                  @click="movementForm.type = 'INCOME'"
                >
                  Ingreso
                </button>
                <button
                  type="button"
                  class="flex-1 py-2 rounded-lg text-sm font-medium border"
                  :class="movementForm.type === 'WITHDRAWAL' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500'"
                  @click="movementForm.type = 'WITHDRAWAL'"
                >
                  Retiro
                </button>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input v-model.number="movementForm.amount" type="number" min="0.01" step="0.01" required class="input-field" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input v-model="movementForm.reason" type="text" required class="input-field" placeholder="Ej. Compra de hielo" />
              </div>
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" class="btn-secondary" @click="showMovementModal = false">Cancelar</button>
                <button type="submit" class="btn-primary" :disabled="loadingAction">
                  {{ loadingAction ? 'Guardando...' : 'Registrar' }}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Close modal -->
    <TransitionRoot appear :show="showCloseModal" as="template">
      <Dialog as="div" class="relative z-50" @close="showCloseModal = false">
        <div class="fixed inset-0 bg-black/25" />
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Cerrar caja</DialogTitle>
            <p class="text-sm text-gray-500 mb-4">
              Esperado en caja: <strong>{{ formatCurrency(current?.expectedAmount ?? 0) }}</strong>
            </p>
            <form class="space-y-4" @submit.prevent="handleClose">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Monto contado (arqueo físico)</label>
                <input v-model.number="closeForm.countedAmount" type="number" min="0" step="0.01" required class="input-field" />
              </div>
              <p v-if="closeForm.countedAmount !== null" class="text-sm font-medium" :class="closeDifferenceClass">
                {{ closeDifferenceLabel }}
              </p>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <input v-model="closeForm.closingNotes" type="text" class="input-field" placeholder="Ej. Faltante justificado por..." />
              </div>
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" class="btn-secondary" @click="showCloseModal = false">Cancelar</button>
                <button type="submit" class="btn-primary" :disabled="loadingAction">
                  {{ loadingAction ? 'Cerrando...' : 'Confirmar cierre' }}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { BanknotesIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import {
  useCash,
  CASH_STATUS_CLASSES,
  type CashMovementType,
} from '~/composables/commerce/useCash'

const {
  current, sessions, loading, loadingAction, error,
  isOpen, formatCurrency,
  loadCurrent, openSession, closeSession, addMovement, loadSessions,
} = useCash()

const breadcrumbItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Caja' },
]

const loadingHistory = ref(false)
const closedSessions = computed(() => sessions.value.filter(s => s.status === 'CLOSED'))

// ── Open form ──────────────────────────────────────────────────────────────
const openForm = ref<{ openingAmount: number | null; notes: string }>({ openingAmount: null, notes: '' })

async function handleOpen() {
  if (openForm.value.openingAmount === null) return
  const ok = await openSession({ openingAmount: openForm.value.openingAmount, notes: openForm.value.notes || undefined })
  if (ok) openForm.value = { openingAmount: null, notes: '' }
}

// ── Movement modal ─────────────────────────────────────────────────────────
const showMovementModal = ref(false)
const movementForm = ref<{ type: CashMovementType; amount: number | null; reason: string }>({
  type: 'WITHDRAWAL', amount: null, reason: '',
})

async function handleAddMovement() {
  if (!movementForm.value.amount) return
  const ok = await addMovement({
    type: movementForm.value.type,
    amount: movementForm.value.amount,
    reason: movementForm.value.reason,
  })
  if (ok) {
    showMovementModal.value = false
    movementForm.value = { type: 'WITHDRAWAL', amount: null, reason: '' }
  }
}

// ── Close modal ─────────────────────────────────────────────────────────────
const showCloseModal = ref(false)
const closeForm = ref<{ countedAmount: number | null; closingNotes: string }>({ countedAmount: null, closingNotes: '' })

const closeDifference = computed(() => {
  if (closeForm.value.countedAmount === null || !current.value) return null
  return closeForm.value.countedAmount - (current.value.expectedAmount ?? 0)
})

const closeDifferenceLabel = computed(() => {
  const diff = closeDifference.value
  if (diff === null) return ''
  if (diff === 0) return 'La caja cuadra exactamente.'
  if (diff > 0) return `Sobrante de ${formatCurrency(diff)}`
  return `Faltante de ${formatCurrency(Math.abs(diff))}`
})

const closeDifferenceClass = computed(() => {
  const diff = closeDifference.value
  if (diff === null || diff === 0) return 'text-gray-500'
  return diff > 0 ? 'text-green-600' : 'text-red-600'
})

async function handleClose() {
  if (closeForm.value.countedAmount === null) return
  const closed = await closeSession({
    countedAmount: closeForm.value.countedAmount,
    closingNotes: closeForm.value.closingNotes || undefined,
  })
  if (closed) {
    showCloseModal.value = false
    closeForm.value = { countedAmount: null, closingNotes: '' }
    await loadHistory()
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

async function loadHistory() {
  loadingHistory.value = true
  await loadSessions({ status: 'CLOSED', limit: 10 })
  loadingHistory.value = false
}

// ── Init ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadCurrent(), loadHistory()])
})
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
