<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">

    <PageHeader
      title="Solicitudes de Depósito"
      description="Verifica el comprobante y aprueba o rechaza la carga de saldo."
      :icon="BanknotesIcon"
      :breadcrumb="[{ label: 'Depósitos' }]"
      :stats="headerStats"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <div v-else-if="items.length === 0" class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <CheckCircleIcon class="h-10 w-10 text-green-400 mx-auto mb-3" />
      <p class="text-sm text-gray-500">No hay solicitudes pendientes por revisar.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div class="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
          <div>
            <p class="text-sm font-bold text-gray-900">{{ item.user?.firstName }} {{ item.user?.lastName }}</p>
            <p class="text-xs text-gray-400">{{ item.user?.email }}</p>
          </div>
          <span class="badge bg-amber-100 text-amber-700">Enviado {{ formatDate(item.createdAt) }}</span>
        </div>

        <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-gray-500">Monto</dt><dd class="font-bold text-gray-900">${{ item.amount.toFixed(2) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Método</dt><dd class="font-medium text-gray-900">{{ item.paymentMethod }}</dd></div>
            <div v-if="item.reference" class="flex justify-between"><dt class="text-gray-500">Referencia</dt><dd class="font-medium text-gray-900 font-mono text-xs">{{ item.reference }}</dd></div>
          </dl>

          <DepositProofPreview :request-id="item.id" />
        </div>

        <div v-if="rejectingId === item.id" class="px-6 pb-4">
          <textarea
            v-model="rejectionReason"
            rows="2"
            placeholder="Motivo del rechazo (visible para el usuario)"
            class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"
          />
        </div>

        <div class="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <template v-if="rejectingId === item.id">
            <button class="btn-secondary text-sm" @click="rejectingId = null">Cancelar</button>
            <button
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60"
              :disabled="processingId === item.id || !rejectionReason.trim()"
              @click="confirmReject(item.id)"
            >
              Confirmar rechazo
            </button>
          </template>
          <template v-else>
            <button
              class="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50"
              :disabled="processingId === item.id"
              @click="rejectingId = item.id; rejectionReason = ''"
            >
              Rechazar
            </button>
            <button
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-60"
              :disabled="processingId === item.id"
              @click="confirmApprove(item.id)"
            >
              {{ processingId === item.id ? 'Procesando…' : 'Aprobar y acreditar saldo' }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { CheckCircleIcon, BanknotesIcon } from '@heroicons/vue/24/outline'
import { useWalletDepositRequests, type WalletDepositRequest } from '~/composables/wallets/useWalletDepositRequests'
import { useDateFormat } from '~/composables/core/useDateFormat'
import PageHeader from '~/components/ui/PageHeader.vue'

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts (ADMIN_ONLY_ROUTES)
const { fetchPending, review, fetchProofImageBlobUrl } = useWalletDepositRequests()
const { formatDate: fmtDate } = useDateFormat()

const items = ref<WalletDepositRequest[]>([])
const loading = ref(true)
const processingId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)
const rejectionReason = ref('')

const headerStats = computed(() => [
  { label: 'Pendientes', value: items.value.length },
  { label: 'Monto total', value: `$${items.value.reduce((s, i) => s + i.amount, 0).toFixed(2)}` },
])

// Comprobante: no es público, se pide autenticado y se muestra como blob URL.
const DepositProofPreview = defineComponent({
  props: { requestId: { type: String, required: true } },
  setup(props) {
    const url = ref<string | null>(null)
    const failed = ref(false)
    fetchProofImageBlobUrl(props.requestId).then(u => { url.value = u }).catch(() => { failed.value = true })
    return () => h('div', { class: 'aspect-video rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center' }, [
      url.value
        ? h('img', { src: url.value, class: 'w-full h-full object-contain cursor-zoom-in', onClick: () => window.open(url.value!, '_blank') })
        : failed.value
          ? h('span', { class: 'text-xs text-gray-400' }, 'No se pudo cargar el comprobante')
          : h('div', { class: 'w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin' }),
    ])
  },
})

async function load() {
  loading.value = true
  try {
    const res = await fetchPending()
    items.value = res.data
  } finally {
    loading.value = false
  }
}

async function confirmApprove(id: string) {
  processingId.value = id
  try {
    await review(id, 'APPROVED')
    items.value = items.value.filter(i => i.id !== id)
  } finally {
    processingId.value = null
  }
}

async function confirmReject(id: string) {
  processingId.value = id
  try {
    await review(id, 'REJECTED', rejectionReason.value.trim())
    items.value = items.value.filter(i => i.id !== id)
    rejectingId.value = null
  } finally {
    processingId.value = null
  }
}

function formatDate(iso: string) {
  return fmtDate(iso)
}

onMounted(load)
</script>
