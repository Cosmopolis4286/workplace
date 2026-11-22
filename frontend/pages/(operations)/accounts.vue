<template>
  <div>
    <PageHeader
      title="Cuentas por Cobrar y Pagar"
      description="Fiado a clientes y deudas con proveedores — con riesgo de reposición por devaluación"
      :icon="BanknotesIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton
          v-if="activeTab !== 'payables'"
          variant="primary"
          :icon="PlusIcon"
          @click="showReceivableModal = true"
        >
          Registrar fiado
        </HeaderActionButton>
        <HeaderActionButton
          v-else
          variant="primary"
          :icon="PlusIcon"
          @click="showPayableModal = true"
        >
          Registrar deuda
        </HeaderActionButton>
      </template>
    </PageHeader>

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <div class="flex gap-2 mb-4 border-b border-gray-200">
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
        :class="activeTab === 'ledger' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'ledger'"
      >
        Libreta
      </button>
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
        :class="activeTab === 'receivables' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'receivables'"
      >
        Por Cobrar
      </button>
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
        :class="activeTab === 'payables' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'payables'"
      >
        Por Pagar
      </button>
    </div>

    <CustomerLedgerList
      v-if="activeTab === 'ledger'"
      :rows="ledger"
      :loading="loading"
      @create="showReceivableModal = true"
      @open="openCustomer"
    />

    <ReceivablesList
      v-else-if="activeTab === 'receivables'"
      :receivables="receivables"
      :loading="loading"
      @create="showReceivableModal = true"
      @delete="confirmDeleteReceivable"
      @mark-paid="doMarkReceivablePaid"
      @pay="openPayment"
    />

    <PayablesList
      v-else
      :payables="payables"
      :loading="loading"
      @create="showPayableModal = true"
      @delete="confirmDeletePayable"
      @mark-paid="doMarkPayablePaid"
    />

    <ReceivableModal
      :is-open="showReceivableModal"
      @close="showReceivableModal = false"
      @saved="refreshReceivables"
    />

    <ReceivablePaymentModal
      :is-open="paymentTarget !== null"
      :receivable="paymentTarget"
      @close="paymentTarget = null"
      @saved="onPaymentSaved"
    />

    <CustomerLedgerModal
      ref="ledgerModal"
      :is-open="ledgerCustomerId !== null"
      :customer-id="ledgerCustomerId"
      @close="ledgerCustomerId = null"
      @pay="openPayment"
      @changed="loadLedger()"
    />

    <PayableModal
      :is-open="showPayableModal"
      @close="showPayableModal = false"
      @saved="loadPayables()"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { BanknotesIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import ReceivablesList from '~/components/accounts/ReceivablesList.vue'
import CustomerLedgerList from '~/components/accounts/CustomerLedgerList.vue'
import ReceivablePaymentModal from '~/components/modals/ReceivablePaymentModal.vue'
import CustomerLedgerModal from '~/components/modals/CustomerLedgerModal.vue'
import { useToast } from '~/composables/ui/useToast'
import PayablesList from '~/components/accounts/PayablesList.vue'
import ReceivableModal from '~/components/modals/ReceivableModal.vue'
import PayableModal from '~/components/modals/PayableModal.vue'
import { useAccounts, type Receivable, type Payable } from '~/composables/commerce/useAccounts'

const {
  receivables, payables, loading, error, ledger, ledgerTotalUsd,
  loadReceivables, loadPayables, loadLedger,
  markReceivableAsPaid, markPayableAsPaid,
  deleteReceivable, deletePayable,
} = useAccounts()

const activeTab = ref<'ledger' | 'receivables' | 'payables'>('ledger')
const paymentTarget = ref<Receivable | null>(null)
const ledgerCustomerId = ref<string | null>(null)
const ledgerModal = ref<InstanceType<typeof CustomerLedgerModal> | null>(null)
const toast = useToast()

function openCustomer(customerId: string) {
  ledgerCustomerId.value = customerId
}

function openPayment(receivable: Receivable) {
  paymentTarget.value = receivable
}

async function refreshReceivables() {
  await Promise.all([loadReceivables(), loadLedger()])
}

async function onPaymentSaved(updated: Receivable) {
  toast.success(updated.status === 'PAID' ? 'Cuenta saldada' : 'Abono registrado')
  await refreshReceivables()
  ledgerModal.value?.refresh()
}
const showReceivableModal = ref(false)
const showPayableModal = ref(false)

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Cuentas por Cobrar y Pagar' },
]

const headerStats = computed(() => {
  const pendingReceivables = receivables.value.filter(r => r.status === 'PENDING' || r.status === 'OVERDUE')
  const pendingPayables = payables.value.filter(p => p.status === 'PENDING')
  // Saldo real (descontando abonos), a la tasa de cada venta.
  const totalReceivableUsd = ledgerTotalUsd.value
  const totalPayableUsd = pendingPayables.reduce((sum, p) => sum + p.amountUsd, 0)

  return [
    { label: 'Por cobrar (pendiente)', value: `$${totalReceivableUsd.toFixed(2)}`, change: `${pendingReceivables.length} cuenta(s)`, changeType: 'neutral' },
    { label: 'Por pagar (pendiente)', value: `$${totalPayableUsd.toFixed(2)}`, change: `${pendingPayables.length} cuenta(s)`, changeType: 'neutral' },
  ]
})

async function doMarkReceivablePaid(receivable: Receivable) {
  if (!confirm(`¿Marcar como cobrado todo el saldo de "${receivable.description}"?`)) return
  if (await markReceivableAsPaid(receivable.id)) await loadLedger()
}

async function doMarkPayablePaid(payable: Payable) {
  await markPayableAsPaid(payable.id)
}

async function confirmDeleteReceivable(receivable: Receivable) {
  if (!confirm(`¿Eliminar "${receivable.description}"?`)) return
  if (await deleteReceivable(receivable.id)) await loadLedger()
}

async function confirmDeletePayable(payable: Payable) {
  if (!confirm(`¿Eliminar "${payable.description}"?`)) return
  await deletePayable(payable.id)
}

onMounted(async () => {
  await Promise.all([loadReceivables(), loadPayables(), loadLedger()])
})
</script>
