<template>
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-bold text-gray-900">Testimonios</h2>
      <div class="flex items-center gap-2">
        <button
          @click="showCandidatesModal = true; loadReviewCandidates()"
          class="text-sm font-semibold border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Crear desde reseña verificada
        </button>
        <button
          @click="openTestimonialModal(null)"
          class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          + Nuevo
        </button>
      </div>
    </div>

    <div v-if="loading" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

    <div v-else class="divide-y divide-gray-50">
      <div
        v-for="(t, idx) in testimonials"
        :key="t.id"
        class="px-6 py-4 flex items-start gap-4"
      >
        <!-- Reorder -->
        <div class="flex flex-col gap-0.5 flex-shrink-0">
          <button
            :disabled="idx === 0"
            @click="move(idx, -1)"
            class="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300"
          >
            <ChevronUpIcon class="w-4 h-4" />
          </button>
          <button
            :disabled="idx === testimonials.length - 1"
            @click="move(idx, 1)"
            class="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300"
          >
            <ChevronDownIcon class="w-4 h-4" />
          </button>
        </div>

        <!-- Avatar preview -->
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          :style="{ backgroundColor: t.avatarColor }"
        >
          {{ t.initials }}
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-gray-900">
            {{ t.name }} <span class="font-normal text-gray-400 text-xs">— {{ t.role }}</span>
            <span v-if="t.sourceReviewId" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600" title="Originado de una reseña real verificada">
              ✓ Verificado
            </span>
          </p>
          <p class="text-sm text-gray-500 mt-1 line-clamp-2 italic">"{{ t.quote }}"</p>
          <p class="text-[11px] text-gray-400 mt-1">Creado el {{ formatDateTime(t.createdAt) }}</p>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="t.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'"
          >
            {{ t.isActive ? 'Activo' : 'Oculto' }}
          </span>
          <button @click="openTestimonialModal(t)" class="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <PencilIcon class="w-4 h-4" />
          </button>
          <button @click="deleteTestimonial(t.id)" class="p-1.5 text-gray-400 hover:text-red-500 rounded">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-if="testimonials.length === 0 && !loading" class="px-6 py-10 text-center text-sm text-gray-400">
        No hay testimonios. Crea el primero.
      </div>
    </div>
  </div>

  <!-- Modal Candidatos a testimonio (reseñas verificadas) -->
  <Teleport to="body">
    <div v-if="showCandidatesModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showCandidatesModal = false" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <h3 class="font-black text-gray-900 text-lg">Reseñas verificadas con buen rating</h3>
        <p class="text-sm text-gray-500">Solo se muestran reseñas de 4-5★ con comentario, originadas en una compra o servicio real, aún no usadas como testimonio.</p>

        <div v-if="loadingCandidates" class="text-center text-sm text-gray-400 py-6">Cargando…</div>
        <div v-else-if="reviewCandidates.length === 0" class="text-center text-sm text-gray-400 py-6">
          No hay reseñas verificadas disponibles por ahora.
        </div>
        <div v-else class="space-y-2">
          <div v-for="c in reviewCandidates" :key="c.id" class="border border-gray-100 rounded-xl p-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-900">{{ c.author.firstName }} {{ c.author.lastName }} <span class="text-amber-500">{{ '★'.repeat(c.rating) }}</span></p>
              <p class="text-sm text-gray-500 italic line-clamp-2">"{{ c.comment }}"</p>
            </div>
            <button
              @click="useAsTestimonial(c.id)"
              :disabled="creatingFromReview === c.id"
              class="text-xs font-semibold bg-workplace-red text-white px-3 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0"
            >
              {{ creatingFromReview === c.id ? 'Creando…' : 'Usar' }}
            </button>
          </div>
        </div>

        <button @click="showCandidatesModal = false" class="w-full border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
          Cerrar
        </button>
      </div>
    </div>
  </Teleport>

  <!-- Modal Testimonio -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showModal = false" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h3 class="font-black text-gray-900 text-lg">{{ editingId ? 'Editar testimonio' : 'Nuevo testimonio' }}</h3>

        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cita</label>
            <textarea v-model="form.quote" rows="3" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" placeholder="Escribe el testimonio…" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</label>
              <input v-model="form.name" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cargo / Comercio</label>
              <input v-model="form.role" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Iniciales (auto)</label>
              <input v-model="form.initials" placeholder="Ej: LM" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Color avatar</label>
              <div class="mt-1 flex items-center gap-2">
                <input type="color" v-model="form.avatarColor" class="w-10 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
                <input v-model="form.avatarColor" class="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" />
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="isActive" v-model="form.isActive" class="rounded" />
            <label for="isActive" class="text-sm text-gray-700">Mostrar en landing</label>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button @click="showModal = false" class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
            Cancelar
          </button>
          <button
            @click="saveTestimonial"
            :disabled="saving || !form.quote || !form.name"
            class="flex-1 bg-workplace-red text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 text-sm"
          >
            {{ saving ? 'Guardando…' : (editingId ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ChevronUpIcon, ChevronDownIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { useLandingCrudSection } from '~/composables/admin/useLandingCrudSection'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useDateFormat } from '~/composables/core/useDateFormat'

export interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  initials: string
  avatarColor: string
  isActive: boolean
  sortOrder: number
  sourceReviewId?: string | null
  createdAt: string
}
interface TestimonialForm {
  quote: string; name: string; role: string; initials: string; avatarColor: string; isActive: boolean
}
interface ReviewCandidate {
  id: string
  rating: number
  comment: string
  author: { firstName: string; lastName: string }
}

const emit = defineEmits<{
  error: [message: string | null]
  count: [count: number]
}>()

const { confirm } = useConfirm()
const { formatDateTime } = useDateFormat()

const {
  items: testimonials, loading, showModal, saving,
  editingId, form, error: testimonialsError,
  load, openModal: openTestimonialModalRaw, save: saveTestimonialRaw,
  remove: removeTestimonial, move,
} = useLandingCrudSection<Testimonial, TestimonialForm>(
  '/landing/admin/testimonials',
  () => ({ quote: '', name: '', role: '', initials: '', avatarColor: '#EF4444', isActive: true }),
  { reorder: true },
)
function openTestimonialModal(t: Testimonial | null) { openTestimonialModalRaw(t) }
async function saveTestimonial() {
  if (!form.quote || !form.name) return
  await saveTestimonialRaw()
}
async function deleteTestimonial(id: string) {
  const ok = await confirm({ title: 'Eliminar testimonio', message: '¿Eliminar este testimonio?', confirmText: 'Eliminar', variant: 'danger' })
  if (!ok) return
  await removeTestimonial(id)
}

const showCandidatesModal = ref(false)
const reviewCandidates = ref<ReviewCandidate[]>([])
const loadingCandidates = ref(false)
const creatingFromReview = ref<string | null>(null)

async function loadReviewCandidates() {
  loadingCandidates.value = true
  try {
    const { get } = useApi()
    reviewCandidates.value = await get<ReviewCandidate[]>('/landing/admin/testimonials/review-candidates')
  } catch (e: any) {
    testimonialsError.value = getApiErrorMessage(e, 'Error al cargar reseñas candidatas')
  } finally {
    loadingCandidates.value = false
  }
}

async function useAsTestimonial(reviewId: string) {
  creatingFromReview.value = reviewId
  try {
    const { post } = useApi()
    const created = await post<Testimonial>(`/landing/admin/testimonials/from-review/${reviewId}`, {})
    testimonials.value.push(created)
    reviewCandidates.value = reviewCandidates.value.filter((c: ReviewCandidate) => c.id !== reviewId)
  } catch (e: any) {
    testimonialsError.value = getApiErrorMessage(e, 'Error al crear el testimonio')
  } finally {
    creatingFromReview.value = null
  }
}

watch(testimonialsError, (v) => emit('error', v))
watch(testimonials, (v) => emit('count', v.length), { deep: false })

onMounted(load)
</script>
