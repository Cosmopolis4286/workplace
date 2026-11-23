<template>
  <section v-if="isSuperAdmin" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-gray-900">Revisión reforzada</h2>
        <p class="text-sm text-gray-500">
          Solicitudes para operaciones de riesgo elevado. Solo SUPERADMIN puede decidir o revocar.
        </p>
      </div>
      <button class="btn-secondary text-sm" :disabled="loading" @click="load">
        {{ loading ? 'Actualizando…' : 'Actualizar bandeja' }}
      </button>
    </div>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="n in 2" :key="n" class="h-32 animate-pulse rounded-2xl bg-gray-100" />
    </div>
    <div v-else-if="items.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center">
      <p class="text-sm text-gray-500">No hay solicitudes de revisión reforzada pendientes.</p>
    </div>
    <article
      v-for="item in items"
      :key="item.id"
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <p class="font-semibold text-gray-900">{{ item.user?.firstName }} {{ item.user?.lastName }}</p>
          <p class="text-xs text-gray-500">{{ item.user?.email }} · KYC {{ item.user?.kycStatus }}</p>
        </div>
        <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          Pendiente · {{ formatDate(item.createdAt) }}
        </span>
      </div>
      <div class="space-y-3 px-5 py-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo de la solicitud</p>
          <p class="mt-1 whitespace-pre-wrap text-sm text-gray-800">{{ item.requestReason }}</p>
        </div>
        <label class="block">
          <span class="text-xs font-semibold text-gray-600">Motivo de la decisión (obligatorio)</span>
          <textarea
            v-model="reasons[item.id]"
            rows="2"
            maxlength="500"
            placeholder="Documentación, controles y justificación de la decisión…"
            class="mt-1 w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </label>
        <p class="text-xs text-gray-500">
          Si apruebas, la autorización vence automáticamente en 90 días. El backend no permite más de 365 días.
        </p>
      </div>
      <div class="flex flex-wrap justify-end gap-2 bg-gray-50 px-5 py-3">
        <button
          class="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          :disabled="processingId === item.id || (reasons[item.id] || '').trim().length < 10"
          @click="decide(item.id, 'REJECTED')"
        >
          Rechazar
        </button>
        <button
          class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          :disabled="processingId === item.id || (reasons[item.id] || '').trim().length < 10"
          @click="decide(item.id, 'APPROVED')"
        >
          {{ processingId === item.id ? 'Procesando…' : 'Aprobar por 90 días' }}
        </button>
      </div>
    </article>

    <div class="border-t border-gray-200 pt-5">
      <h3 class="font-semibold text-gray-900">Aprobaciones vigentes</h3>
      <p class="mb-3 text-xs text-gray-500">Puedes revocar una habilitación en cualquier momento. La revocación queda auditada.</p>
      <div v-if="activeItems.length === 0 && !loading" class="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
        No hay revisiones reforzadas activas.
      </div>
      <article v-for="item in activeItems" :key="item.id" class="mb-3 rounded-2xl border border-green-200 bg-white p-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-gray-900">{{ item.user?.firstName }} {{ item.user?.lastName }}</p>
            <p class="text-xs text-gray-500">{{ item.user?.email }}</p>
          </div>
          <span class="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Vigente hasta {{ item.expiresAt ? formatDate(item.expiresAt) : 'sin vencimiento' }}
          </span>
        </div>
        <p class="mt-2 text-sm text-gray-600">{{ item.decisionReason }}</p>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            v-model="revokeReasons[item.id]"
            maxlength="500"
            placeholder="Motivo de revocación (mínimo 10 caracteres)"
            class="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-400"
          />
          <button
            class="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            :disabled="processingId === item.id || (revokeReasons[item.id] || '').trim().length < 10"
            @click="revoke(item.id)"
          >
            {{ processingId === item.id ? 'Procesando…' : 'Revocar acceso' }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useKyc, type EnhancedReviewRequest } from '~/composables/kyc/useKyc'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPERADMIN')
const { fetchPendingEnhancedReviews, fetchActiveEnhancedReviews, reviewEnhancedRequest, revokeEnhancedReview } = useKyc()
const { formatDate } = useDateFormat()

const items = ref<EnhancedReviewRequest[]>([])
const reasons = ref<Record<string, string>>({})
const revokeReasons = ref<Record<string, string>>({})
const activeItems = ref<EnhancedReviewRequest[]>([])
const loading = ref(false)
const processingId = ref<string | null>(null)
const error = ref<string | null>(null)

async function load() {
  if (!isSuperAdmin.value) return
  loading.value = true
  error.value = null
  try {
    const [pending, active] = await Promise.all([
      fetchPendingEnhancedReviews(),
      fetchActiveEnhancedReviews(),
    ])
    items.value = pending.data
    activeItems.value = active.data
  } catch (e: any) {
    error.value = getApiErrorMessage(e, 'No se pudo cargar la bandeja de revisión reforzada')
  } finally {
    loading.value = false
  }
}

async function decide(id: string, status: 'APPROVED' | 'REJECTED') {
  const reason = (reasons.value[id] || '').trim()
  if (reason.length < 10) return
  processingId.value = id
  error.value = null
  try {
    await reviewEnhancedRequest(id, status, reason)
    items.value = items.value.filter(item => item.id !== id)
    delete reasons.value[id]
  } catch (e: any) {
    error.value = getApiErrorMessage(e, 'No se pudo registrar la decisión')
  } finally {
    processingId.value = null
  }
}

async function revoke(id: string) {
  const reason = (revokeReasons.value[id] || '').trim()
  if (reason.length < 10) return
  processingId.value = id
  error.value = null
  try {
    await revokeEnhancedReview(id, reason)
    activeItems.value = activeItems.value.filter(item => item.id !== id)
    delete revokeReasons.value[id]
  } catch (e: any) {
    error.value = getApiErrorMessage(e, 'No se pudo revocar la revisión reforzada')
  } finally {
    processingId.value = null
  }
}

onMounted(load)
</script>
