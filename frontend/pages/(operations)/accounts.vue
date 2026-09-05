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
          v-if="activeTab === 'receivables'"
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

    <ReceivablesList
      v-if="activeTab === 'receivables'"
      :receivables="receivables"
      :loading="loading"
      @create="showReceivableModal = true"
      @delete="confirmDeleteReceivable"
      @mark-paid="doMarkReceivablePaid"
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
      @saved="loadReceivables()"
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
import PayablesList from '~/components/accounts/PayablesList.vue'
import ReceivableModal from '~/components/modals/ReceivableModal.vue'
import PayableModal from '~/components/modals/PayableModal.vue'
import { useAccounts, type Receivable, type Payable } from '~/composables/commerce/useAccounts'

const {
  receivables, payables, loading, error,
  loadReceivables, loadPayables,
  markReceivableAsPaid, markPayableAsPaid,
  deleteReceivable, deletePayable,
} = useAccounts()

const activeTab = ref<'receivables' | 'payables'>('receivables')
const showReceivableModal = ref(false)
const showPayableModal = ref(false)

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Cuentas por Cobrar y Pagar' },
]

const headerStats = computed(() => {
  const pendingReceivables = receivables.value.filter(r => r.status === 'PENDING')
  const pendingPayables = payables.value.filter(p => p.status === 'PENDING')
  const totalReceivableUsd = pendingReceivables.reduce((sum, r) => sum + r.amountUsd, 0)
  const totalPayableUsd = pendingPayables.reduce((sum, p) => sum + p.amountUsd, 0)

  return [
    { label: 'Por cobrar (pendiente)', value: `$${totalReceivableUsd.toFixed(2)}`, change: `${pendingReceivables.length} cuenta(s)`, changeType: 'neutral' },
    { label: 'Por pagar (pendiente)', value: `$${totalPayableUsd.toFixed(2)}`, change: `${pendingPayables.length} cuenta(s)`, changeType: 'neutral' },
  ]
})

async function doMarkReceivablePaid(receivable: Receivable) {
  await markReceivableAsPaid(receivable.id)
}

async function doMarkPayablePaid(payable: Payable) {
  await markPayableAsPaid(payable.id)
}

async function confirmDeleteReceivable(receivable: Receivable) {
  if (!confirm(`¿Eliminar "${receivable.description}"?`)) return
  await deleteReceivable(receivable.id)
}

async function confirmDeletePayable(payable: Payable) {
  if (!confirm(`¿Eliminar "${payable.description}"?`)) return
  await deletePayable(payable.id)
}

onMounted(async () => {
  await Promise.all([loadReceivables(), loadPayables()])
})
</script>
