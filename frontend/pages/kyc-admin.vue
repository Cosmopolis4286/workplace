<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">

    <div>
      <h1 class="text-2xl font-black text-gray-900">Verificaciones de Identidad</h1>
      <p class="text-sm text-gray-500 mt-1">Revisa y aprueba o rechaza las solicitudes de KYC pendientes.</p>
    </div>

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
            <p class="text-xs text-gray-400">{{ item.user?.email }} · {{ item.user?.role }}</p>
          </div>
          <span class="badge bg-amber-100 text-amber-700">Enviado {{ formatDate(item.createdAt) }}</span>
        </div>

        <div class="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-gray-500">Documento</dt><dd class="font-medium text-gray-900">{{ docTypeLabel(item.documentType) }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Número</dt><dd class="font-medium text-gray-900">{{ item.documentNumber }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Nombre declarado</dt><dd class="font-medium text-gray-900">{{ item.fullName }}</dd></div>
          </dl>

          <div class="grid grid-cols-3 gap-2">
            <KycImagePreview :verification-id="item.id" field="frontImageUrl" label="Frente" />
            <KycImagePreview v-if="item.backImageUrl" :verification-id="item.id" field="backImageUrl" label="Reverso" />
            <KycImagePreview :verification-id="item.id" field="selfieImageUrl" label="Selfie" />
          </div>
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
              {{ processingId === item.id ? 'Procesando…' : 'Aprobar' }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, onMounted } from 'vue'
import { CheckCircleIcon } from '@heroicons/vue/24/outline'
import { useKyc, type IdentityVerification, type KycDocumentType } from '~/composables/useKyc'
import KycImagePreview from '~/components/kyc/KycImagePreview.vue'

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts
// (ADMIN_ONLY_ROUTES), que además espera la verificación real de sesión
// antes de decidir — este chequeo inline corría antes de esa verificación.
const { fetchPending, review } = useKyc()

const items = ref<IdentityVerification[]>([])
const loading = ref(true)
const processingId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)
const rejectionReason = ref('')

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

function docTypeLabel(type: KycDocumentType) {
  return ({
    CEDULA: 'Cédula',
    DNI: 'DNI',
    PASSPORT: 'Pasaporte',
    DRIVERS_LICENSE: 'Licencia de conducir',
  })[type] ?? type
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>
