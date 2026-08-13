<template>
  <div>
    <PageHeader
      title="Verificación de Identidad"
      description="Verifica tu identidad para poder retirar, transferir y recibir pagos sin restricciones"
      :icon="ShieldCheckIcon"
    />

    <div v-if="loading" class="card-premium p-6 animate-pulse space-y-4">
      <div class="h-6 w-48 bg-gray-200 rounded" />
      <div class="h-32 bg-gray-200 rounded-xl" />
    </div>

    <div v-else class="max-w-2xl space-y-6">

      <!-- Estado actual -->
      <div
        class="card-premium p-6 border-l-4"
        :class="{
          'border-l-gray-300': status === 'NONE',
          'border-l-amber-400': status === 'PENDING',
          'border-l-green-500': status === 'APPROVED',
          'border-l-red-400': status === 'REJECTED',
        }"
      >
        <div class="flex items-center gap-3">
          <div
            class="p-3 rounded-xl shadow-lg"
            :class="{
              'bg-gradient-to-br from-gray-400 to-gray-500': status === 'NONE',
              'bg-gradient-to-br from-amber-400 to-amber-500': status === 'PENDING',
              'bg-gradient-to-br from-green-500 to-green-600': status === 'APPROVED',
              'bg-gradient-to-br from-red-400 to-red-500': status === 'REJECTED',
            }"
          >
            <component :is="statusIcon" class="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-900">{{ statusLabel }}</h3>
            <p class="text-sm text-gray-500">{{ statusDescription }}</p>
          </div>
        </div>

        <div v-if="status === 'REJECTED' && myStatus?.latestSubmission?.rejectionReason" class="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <strong>Motivo del rechazo:</strong> {{ myStatus.latestSubmission.rejectionReason }}
        </div>
      </div>

      <!-- Formulario de envío (solo si NONE o REJECTED) -->
      <div v-if="status === 'NONE' || status === 'REJECTED'" class="card-premium p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4">
          {{ status === 'REJECTED' ? 'Enviar nuevamente' : 'Enviar documentos' }}
        </h3>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div v-if="formError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{{ formError }}</div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de documento <span class="text-red-500">*</span></label>
              <select v-model="form.documentType" required class="input-field">
                <option value="CEDULA">Cédula</option>
                <option value="DNI">DNI</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="DRIVERS_LICENSE">Licencia de conducir</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Número de documento <span class="text-red-500">*</span></label>
              <input v-model="form.documentNumber" type="text" required minlength="4" maxlength="30" placeholder="V-12345678" class="input-field" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nombre completo (tal como aparece en el documento) <span class="text-red-500">*</span></label>
            <input v-model="form.fullName" type="text" required minlength="3" maxlength="150" class="input-field" />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
            <input v-model="form.birthDate" type="date" class="input-field" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ImageDropInput v-model="frontImage" label="Frente del documento" required />
            <ImageDropInput v-model="backImage" label="Reverso (opcional)" />
            <ImageDropInput v-model="selfieImage" label="Selfie sosteniendo el documento" required />
          </div>

          <p class="text-xs text-gray-400">
            Tus documentos se usan únicamente para verificar tu identidad y no se comparten con terceros.
          </p>

          <button
            type="submit"
            :disabled="submitting"
            class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="submitting" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ submitting ? 'Enviando...' : 'Enviar para revisión' }}
          </button>
        </form>
      </div>

      <!-- Resumen de la última solicitud (PENDING / APPROVED) -->
      <div v-if="myStatus?.latestSubmission && (status === 'PENDING' || status === 'APPROVED')" class="card-premium p-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Última solicitud</h3>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between"><dt class="text-gray-500">Documento</dt><dd class="font-medium text-gray-900">{{ docTypeLabel(myStatus.latestSubmission.documentType) }} — {{ myStatus.latestSubmission.documentNumber }}</dd></div>
          <div class="flex justify-between"><dt class="text-gray-500">Nombre</dt><dd class="font-medium text-gray-900">{{ myStatus.latestSubmission.fullName }}</dd></div>
          <div class="flex justify-between"><dt class="text-gray-500">Enviado</dt><dd class="font-medium text-gray-900">{{ formatDate(myStatus.latestSubmission.createdAt) }}</dd></div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import {
  ShieldCheckIcon,
  ClockIcon,
  CheckBadgeIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import ImageDropInput from '~/components/ui/ImageDropInput.vue'
import { useKyc, type KycDocumentType } from '~/composables/kyc/useKyc'
import { useDateFormat } from '~/composables/core/useDateFormat'

useHead({ title: 'Verificación de Identidad — WorkPlace Manager' })

const { myStatus, loading, fetchMyStatus, submitVerification } = useKyc()
const { formatDate: fmtDate } = useDateFormat()

const status = computed(() => myStatus.value?.kycStatus ?? 'NONE')

const statusIcon = computed(() => ({
  NONE: ShieldCheckIcon,
  PENDING: ClockIcon,
  APPROVED: CheckBadgeIcon,
  REJECTED: XCircleIcon,
}[status.value]))

const statusLabel = computed(() => ({
  NONE: 'Sin verificar',
  PENDING: 'En revisión',
  APPROVED: 'Identidad verificada',
  REJECTED: 'Verificación rechazada',
}[status.value]))

const statusDescription = computed(() => ({
  NONE: 'Aún no has enviado tus documentos de identidad.',
  PENDING: 'Tu solicitud está siendo revisada. Esto puede tomar hasta 24-48 horas.',
  APPROVED: 'Puedes retirar, transferir y recibir pagos sin restricciones.',
  REJECTED: 'Revisa el motivo del rechazo y vuelve a intentarlo con documentos más claros.',
}[status.value]))

function docTypeLabel(type: KycDocumentType) {
  return ({
    CEDULA: 'Cédula',
    DNI: 'DNI',
    PASSPORT: 'Pasaporte',
    DRIVERS_LICENSE: 'Licencia de conducir',
  })[type] ?? type
}

function formatDate(iso: string) {
  return fmtDate(iso)
}

// ─── Formulario ───────────────────────────────────────────────────────────────
const form = ref({
  documentType: 'CEDULA' as KycDocumentType,
  documentNumber: '',
  fullName: '',
  birthDate: '',
})
const frontImage = ref<File | null>(null)
const backImage = ref<File | null>(null)
const selfieImage = ref<File | null>(null)
const submitting = ref(false)
const formError = ref('')

async function handleSubmit() {
  formError.value = ''

  if (!frontImage.value) {
    formError.value = 'Sube la foto del frente de tu documento.'
    return
  }
  if (!selfieImage.value) {
    formError.value = 'Sube una selfie sosteniendo tu documento.'
    return
  }

  submitting.value = true
  try {
    await submitVerification({
      documentType: form.value.documentType,
      documentNumber: form.value.documentNumber,
      fullName: form.value.fullName,
      birthDate: form.value.birthDate || undefined,
      frontImage: frontImage.value,
      backImage: backImage.value ?? undefined,
      selfieImage: selfieImage.value,
    })
    frontImage.value = null
    backImage.value = null
    selfieImage.value = null
  } catch (e: any) {
    formError.value = e?.data?.message ?? e?.message ?? 'No se pudo enviar la solicitud.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => { fetchMyStatus() })
</script>
