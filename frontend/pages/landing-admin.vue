<template>
  <div class="p-6 max-w-5xl mx-auto space-y-8">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-gray-900">Contenido de la Landing</h1>
        <p class="text-sm text-gray-500 mt-1">Gestiona testimonios y estadísticas públicas que se muestran en la página principal.</p>
      </div>
    </div>

    <!-- ─── Estadísticas públicas ──────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Estadísticas públicas</h2>
        <button
          @click="saveStats"
          :disabled="savingStats"
          class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {{ savingStats ? 'Guardando…' : 'Guardar todo' }}
        </button>
      </div>

      <div class="divide-y divide-gray-50">
        <div
          v-for="stat in editableStats"
          :key="stat.key"
          class="px-6 py-4 grid grid-cols-3 gap-4 items-center"
        >
          <div>
            <p class="text-xs text-gray-400 font-medium mb-1">Clave</p>
            <code class="text-sm text-gray-600 bg-gray-50 px-2 py-0.5 rounded">{{ stat.key }}</code>
          </div>
          <div>
            <p class="text-xs text-gray-400 font-medium mb-1">Etiqueta</p>
            <input
              v-model="stat.label"
              class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
          <div>
            <p class="text-xs text-gray-400 font-medium mb-1">
              Valor
              <span v-if="stat.isDynamic" class="ml-1 text-green-600 font-semibold">(automático)</span>
            </p>
            <div class="flex items-center gap-2">
              <input
                v-model="stat.value"
                :disabled="stat.isDynamic"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                @click="stat.isDynamic = !stat.isDynamic"
                class="text-xs px-2 py-1.5 rounded border border-gray-200 hover:border-gray-300 text-gray-500 whitespace-nowrap"
                :title="stat.isDynamic ? 'Cambiar a valor manual' : 'Calcular automáticamente'"
              >
                {{ stat.isDynamic ? 'Manual' : 'Auto' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="editableStats.length === 0" class="px-6 py-10 text-center text-sm text-gray-400">
          No hay estadísticas configuradas. Se usarán los valores por defecto.
        </div>
      </div>

      <!-- Add stat -->
      <div class="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
        <input v-model="newStatKey" placeholder="clave (ej: restaurants)" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 w-40" />
        <input v-model="newStatLabel" placeholder="Etiqueta" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 flex-1" />
        <input v-model="newStatValue" placeholder="Valor (ej: 500+)" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 w-28" />
        <button
          @click="addStat"
          :disabled="!newStatKey || !newStatLabel"
          class="text-sm font-semibold border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </div>

    <!-- ─── Testimonios ────────────────────────────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Testimonios</h2>
        <button
          @click="openTestimonialModal(null)"
          class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          + Nuevo
        </button>
      </div>

      <div v-if="loadingTestimonials" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

      <div v-else class="divide-y divide-gray-50">
        <div
          v-for="t in testimonials"
          :key="t.id"
          class="px-6 py-4 flex items-start gap-4"
        >
          <!-- Avatar preview -->
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            :style="{ backgroundColor: t.avatarColor }"
          >
            {{ t.initials }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-900">{{ t.name }} <span class="font-normal text-gray-400 text-xs">— {{ t.role }}</span></p>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2 italic">"{{ t.quote }}"</p>
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

        <div v-if="testimonials.length === 0 && !loadingTestimonials" class="px-6 py-10 text-center text-sm text-gray-400">
          No hay testimonios. Crea el primero.
        </div>
      </div>
    </div>

    <!-- ─── Modal Testimonio ───────────────────────────────────────────────── -->
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
                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cargo / Restaurante</label>
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
              :disabled="savingModal || !form.quote || !form.name"
              class="flex-1 bg-workplace-red text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 text-sm"
            >
              {{ savingModal ? 'Guardando…' : (editingId ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

definePageMeta({ middleware: ['auth'] })

interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  initials: string
  avatarColor: string
  isActive: boolean
  sortOrder: number
}

interface AdminStat {
  id?: string
  key: string
  label: string
  value: string
  isDynamic: boolean
  sortOrder: number
}

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl

// ─── Auth check ───────────────────────────────────────────────────────────────
const { user, token } = useAuth()
if (!['SUPERADMIN', 'ADMIN'].includes(user.value?.role ?? '')) {
  navigateTo('/dashboard')
}
const authHeader = computed(() => ({ Authorization: `Bearer ${token.value}` }))

// ─── Stats ────────────────────────────────────────────────────────────────────
const editableStats = ref<AdminStat[]>([])
const savingStats = ref(false)
const newStatKey = ref('')
const newStatLabel = ref('')
const newStatValue = ref('')

async function loadStats() {
  try {
    const data = await $fetch<AdminStat[]>(`${apiUrl}/landing/admin/stats`, {
      headers: authHeader.value,
    })
    editableStats.value = data
  } catch {}
}

async function saveStats() {
  savingStats.value = true
  try {
    await Promise.all(
      editableStats.value.map((s) =>
        $fetch(`${apiUrl}/landing/admin/stats/${s.key}`, {
          method: 'PATCH',
          headers: authHeader.value,
          body: { label: s.label, value: s.value, isDynamic: s.isDynamic },
        }),
      ),
    )
  } finally {
    savingStats.value = false
  }
}

async function addStat() {
  if (!newStatKey.value || !newStatLabel.value) return
  editableStats.value.push({
    key: newStatKey.value.trim(),
    label: newStatLabel.value.trim(),
    value: newStatValue.value.trim(),
    isDynamic: false,
    sortOrder: editableStats.value.length,
  })
  newStatKey.value = ''
  newStatLabel.value = ''
  newStatValue.value = ''
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = ref<Testimonial[]>([])
const loadingTestimonials = ref(false)
const showModal = ref(false)
const savingModal = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  quote: '',
  name: '',
  role: '',
  initials: '',
  avatarColor: '#EF4444',
  isActive: true,
})

async function loadTestimonials() {
  loadingTestimonials.value = true
  try {
    const data = await $fetch<Testimonial[]>(`${apiUrl}/landing/admin/testimonials`, {
      headers: authHeader.value,
    })
    testimonials.value = data
  } finally {
    loadingTestimonials.value = false
  }
}

function openTestimonialModal(t: Testimonial | null) {
  editingId.value = t?.id ?? null
  Object.assign(form, {
    quote: t?.quote ?? '',
    name: t?.name ?? '',
    role: t?.role ?? '',
    initials: t?.initials ?? '',
    avatarColor: t?.avatarColor ?? '#EF4444',
    isActive: t?.isActive ?? true,
  })
  showModal.value = true
}

async function saveTestimonial() {
  if (!form.quote || !form.name) return
  savingModal.value = true
  try {
    if (editingId.value) {
      const updated = await $fetch<Testimonial>(`${apiUrl}/landing/admin/testimonials/${editingId.value}`, {
        method: 'PUT',
        headers: authHeader.value,
        body: { ...form },
      })
      const idx = testimonials.value.findIndex((t) => t.id === editingId.value)
      if (idx !== -1) testimonials.value[idx] = updated
    } else {
      const created = await $fetch<Testimonial>(`${apiUrl}/landing/admin/testimonials`, {
        method: 'POST',
        headers: authHeader.value,
        body: { ...form },
      })
      testimonials.value.push(created)
    }
    showModal.value = false
  } finally {
    savingModal.value = false
  }
}

async function deleteTestimonial(id: string) {
  if (!confirm('¿Eliminar este testimonio?')) return
  await $fetch(`${apiUrl}/landing/admin/testimonials/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  })
  testimonials.value = testimonials.value.filter((t) => t.id !== id)
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  loadStats()
  loadTestimonials()
})
</script>
