<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">

    <PageHeader
      title="Solicitudes de Perfiles"
      description="Revisa y aprueba o rechaza las solicitudes para activar un perfil de Profesional o Negocio."
      :icon="UserGroupIcon"
      :breadcrumb="[{ label: 'Perfiles' }]"
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
          <div class="flex items-center gap-2">
            <span class="badge bg-gray-100 text-gray-700">{{ typeLabel(item.type) }}</span>
            <span class="badge bg-amber-100 text-amber-700">Enviado {{ formatDate(item.createdAt) }}</span>
          </div>
        </div>

        <div class="px-6 py-4">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div v-if="item.category" class="flex justify-between"><dt class="text-gray-500">Categoría</dt><dd class="font-medium text-gray-900">{{ item.category?.icon }} {{ item.category?.name }}</dd></div>
            <div v-if="item.subcategory" class="flex justify-between"><dt class="text-gray-500">Subcategoría</dt><dd class="font-medium text-gray-900">{{ item.subcategory.name }}</dd></div>
            <div v-if="item.subtype" class="flex justify-between"><dt class="text-gray-500">Tipo</dt><dd class="font-medium text-gray-900">{{ item.subtype === 'FREELANCER' ? 'Freelancer' : 'Proveedor de servicios' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Identidad verificada</dt>
              <dd class="font-medium" :class="item.user?.kycStatus === 'APPROVED' ? 'text-green-600' : 'text-amber-600'">
                {{ item.user?.kycStatus === 'APPROVED' ? 'Sí' : 'No' }}
              </dd>
            </div>
          </dl>
        </div>

        <div v-if="rejectingId === item.id" class="px-6 pb-4">
          <textarea
            v-model="rejectionReason"
            rows="2"
            placeholder="Motivo del rechazo (visible para el usuario)"
            class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"
          />
        </div>

        <p v-if="reviewError === item.id" class="mx-6 mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          No se pudo aprobar: {{ item.user?.kycStatus === 'APPROVED' ? 'ocurrió un error inesperado' : 'el solicitante debe verificar su identidad (KYC) primero' }}
        </p>

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
              :disabled="processingId === item.id || item.user?.kycStatus !== 'APPROVED'"
              :title="item.user?.kycStatus !== 'APPROVED' ? 'El solicitante debe verificar su identidad (KYC) antes de aprobar' : ''"
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

import { ref, computed, onMounted } from 'vue'
import { CheckCircleIcon, UserGroupIcon } from '@heroicons/vue/24/outline'
import { useProfileActivations, type ProfileActivation, type ProfileActivationType } from '~/composables/users/useProfileActivations'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useDateFormat } from '~/composables/core/useDateFormat'

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts (ADMIN_ONLY_ROUTES)
const { fetchPending, review } = useProfileActivations()
const { formatDate } = useDateFormat()

const items = ref<ProfileActivation[]>([])
const loading = ref(true)
const processingId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)
const rejectionReason = ref('')
const reviewError = ref<string | null>(null)

const TYPE_LABELS: Record<ProfileActivationType, string> = {
  CUSTOMER: 'Cliente',
  PROFESSIONAL: 'Profesional',
  JOB_SEEKER: 'Candidato de empleo',
  BUSINESS: 'Negocio',
}
function typeLabel(type: ProfileActivationType) {
  return TYPE_LABELS[type] ?? type
}

const headerStats = computed(() => [
  { label: 'Pendientes', value: items.value.length },
])

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
  reviewError.value = null
  try {
    await review(id, 'ACTIVE')
    items.value = items.value.filter(i => i.id !== id)
  } catch {
    reviewError.value = id
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

onMounted(load)
</script>
