<template>
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-bold text-gray-900">Reseñas reportadas</h2>
      <span v-if="reportedReviews.length > 0" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
        {{ reportedReviews.length }} pendiente{{ reportedReviews.length === 1 ? '' : 's' }}
      </span>
    </div>

    <div v-if="loading" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

    <div v-else class="divide-y divide-gray-50">
      <div v-for="report in reportedReviews" :key="report.id" class="px-6 py-4 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-700">
            <span class="font-bold">{{ report.review.author.firstName }} {{ report.review.author.lastName }}</span>
            reseñó a
            <span class="font-bold">{{ report.review.target.firstName }} {{ report.review.target.lastName }}</span>
            — {{ report.review.rating }}★
            <span v-if="report.review.isHidden" class="ml-1 text-xs font-semibold text-gray-400">(oculta)</span>
          </p>
        </div>
        <p v-if="report.review.comment" class="text-sm text-gray-500 italic">"{{ report.review.comment }}"</p>
        <p class="text-xs text-gray-400">Motivo del reporte: {{ report.reason }}</p>
        <div class="flex gap-2 pt-1">
          <button
            v-if="!report.review.isHidden"
            @click="moderate(report.review.id, 'HIDE')"
            class="text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Ocultar reseña
          </button>
          <button
            v-else
            @click="moderate(report.review.id, 'RESTORE')"
            class="text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Restaurar reseña
          </button>
          <button
            @click="moderate(report.review.id, 'DISMISS_REPORTS')"
            class="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Descartar reporte
          </button>
        </div>
      </div>

      <div v-if="reportedReviews.length === 0 && !loading" class="px-6 py-10 text-center text-sm text-gray-400">
        No hay reseñas reportadas pendientes.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

interface ReportedReview {
  id: string
  reason: string
  review: {
    id: string
    rating: number
    comment?: string
    isHidden: boolean
    author: { firstName: string; lastName: string }
    target: { firstName: string; lastName: string }
  }
}

const emit = defineEmits<{
  error: [message: string | null]
  count: [count: number]
}>()

const reportedReviews = ref<ReportedReview[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { get } = useApi()
    reportedReviews.value = await get<ReportedReview[]>('/profiles/admin/reviews/reported')
    emit('count', reportedReviews.value.length)
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al cargar las reseñas reportadas'))
  } finally {
    loading.value = false
  }
}

async function moderate(reviewId: string, action: 'HIDE' | 'RESTORE' | 'DISMISS_REPORTS') {
  emit('error', null)
  try {
    const { patch } = useApi()
    await patch(`/profiles/admin/reviews/${reviewId}/moderate`, { action })
    await load()
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al moderar la reseña'))
  }
}

onMounted(load)
</script>
