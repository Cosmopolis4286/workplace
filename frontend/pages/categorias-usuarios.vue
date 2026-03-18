<template>
  <div>
    <PageHeader
      title="Categorías de Usuarios"
      description="Administra las categorías y subcategorías asignables a los usuarios"
      :icon="TagIcon"
    />

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      {{ error }}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- ── Panel izquierdo: Categorías ────────────────────────────────────── -->
      <div class="card-premium overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 class="text-sm font-bold text-gray-800">Categorías</h2>
          <button
            @click="openCatForm()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-workplace-red text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nueva
          </button>
        </div>

        <!-- Skeleton -->
        <div v-if="loading" class="divide-y divide-gray-50">
          <div v-for="i in 5" :key="i" class="px-5 py-4 animate-pulse flex gap-3">
            <div class="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-2/3" />
              <div class="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>

        <div v-else-if="categories.length === 0" class="px-5 py-10 text-center text-gray-400 text-sm">
          Sin categorías. Crea la primera.
        </div>

        <div v-else class="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
            :class="selectedCat?.id === cat.id ? 'bg-red-50 border-l-4 border-l-workplace-red' : 'border-l-4 border-l-transparent'"
            @click="selectCat(cat)"
          >
            <span class="text-2xl flex-shrink-0 w-9 text-center">{{ cat.icon || '📁' }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate">{{ cat.name }}</div>
              <div class="text-xs text-gray-400">
                {{ cat.subcategories.length }} subcategoría{{ cat.subcategories.length !== 1 ? 's' : '' }}
                · {{ cat._count.users }} usuario{{ cat._count.users !== 1 ? 's' : '' }}
              </div>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button
                @click.stop="openCatForm(cat)"
                class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                @click.stop="confirmDeleteCat(cat)"
                class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Panel derecho: Subcategorías ───────────────────────────────────── -->
      <div class="card-premium overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 class="text-sm font-bold text-gray-800">
            Subcategorías
            <span v-if="selectedCat" class="font-normal text-gray-400 ml-1">— {{ selectedCat.name }}</span>
          </h2>
          <button
            v-if="selectedCat"
            @click="openSubForm()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-workplace-red text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nueva
          </button>
        </div>

        <div v-if="!selectedCat" class="px-5 py-16 text-center text-gray-400 text-sm">
          <svg class="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          Selecciona una categoría para ver sus subcategorías
        </div>

        <div v-else-if="selectedCat.subcategories.length === 0" class="px-5 py-10 text-center text-gray-400 text-sm">
          Sin subcategorías. Crea la primera.
        </div>

        <div v-else class="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          <div
            v-for="sub in selectedCat.subcategories"
            :key="sub.id"
            class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
          >
            <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <span class="flex-1 text-sm text-gray-700">{{ sub.name }}</span>
            <div class="flex gap-1">
              <button
                @click="openSubForm(sub)"
                class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                @click="confirmDeleteSub(sub)"
                class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal Categoría ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="catModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="catModal.show = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-sm">{{ catModal.editing ? 'Editar categoría' : 'Nueva categoría' }}</h3>
              <button @click="catModal.show = false">
                <XMarkIcon class="w-5 h-5 text-gray-400"/>
              </button>
            </div>
            <form @submit.prevent="saveCat" class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="catModal.name" required type="text" autofocus
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Ícono (emoji)</label>
                <div class="flex gap-2">
                  <input v-model="catModal.icon" type="text" placeholder="🍔" maxlength="4"
                    class="w-20 border border-gray-200 rounded-xl px-3 py-2 text-center text-xl focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
                  <div class="flex flex-wrap gap-1.5 items-center">
                    <button
                      v-for="e in EMOJI_SUGGESTIONS"
                      :key="e"
                      type="button"
                      @click="catModal.icon = e"
                      class="text-xl hover:scale-125 transition-transform"
                      :class="catModal.icon === e ? 'ring-2 ring-workplace-red rounded' : ''"
                    >{{ e }}</button>
                  </div>
                </div>
              </div>
              <div v-if="catModal.error" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{{ catModal.error }}</div>
              <div class="flex gap-3">
                <button type="button" @click="catModal.show = false"
                  class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" :disabled="catModal.saving"
                  class="flex-1 py-2 bg-workplace-red text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {{ catModal.saving ? 'Guardando...' : (catModal.editing ? 'Guardar' : 'Crear') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Subcategoría ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="subModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="subModal.show = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-sm">
                {{ subModal.editing ? 'Editar subcategoría' : 'Nueva subcategoría' }}
                <span class="font-normal text-gray-400 ml-1">en {{ selectedCat?.name }}</span>
              </h3>
              <button @click="subModal.show = false">
                <XMarkIcon class="w-5 h-5 text-gray-400"/>
              </button>
            </div>
            <form @submit.prevent="saveSub" class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="subModal.name" required type="text" autofocus
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
              </div>
              <div v-if="subModal.error" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{{ subModal.error }}</div>
              <div class="flex gap-3">
                <button type="button" @click="subModal.show = false"
                  class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" :disabled="subModal.saving"
                  class="flex-1 py-2 bg-workplace-red text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {{ subModal.saving ? 'Guardando...' : (subModal.editing ? 'Guardar' : 'Crear') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Confirmar eliminación ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="deleteModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="deleteModal.show = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 class="text-base font-bold text-gray-800 mb-1">¿Eliminar {{ deleteModal.type === 'cat' ? 'categoría' : 'subcategoría' }}?</h3>
            <p class="text-sm text-gray-500 mb-5">
              Se eliminará <strong>{{ deleteModal.name }}</strong>. Esta acción no se puede deshacer.
            </p>
            <div v-if="deleteModal.error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{{ deleteModal.error }}</div>
            <div class="flex gap-3">
              <button @click="deleteModal.show = false"
                class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button @click="doDelete" :disabled="deleteModal.saving"
                class="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {{ deleteModal.saving ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { TagIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useAuth } from '~/composables/useAuth'

definePageMeta({ middleware: 'auth' })

const { getHeaders, refreshAccessToken } = useAuth()
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subcategory { id: string; name: string }
interface Category {
  id: string
  name: string
  icon?: string
  subcategories: Subcategory[]
  _count: { users: number }
}

// ─── State ────────────────────────────────────────────────────────────────────

const loading    = ref(false)
const error      = ref<string | null>(null)
const categories = ref<Category[]>([])
const selectedCat = ref<Category | null>(null)

// ─── Emoji suggestions ────────────────────────────────────────────────────────

const EMOJI_SUGGESTIONS = ['🍔','🍕','☕','🥗','🍰','💻','📱','🛍️','👗','💄','🏥','💊','📚','🎬','🎵','🏠','🚗','💰','🔧','⚖️']

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(),
        ...(options.headers as Record<string, string> ?? {}),
      },
    })
  let res = await doFetch()
  if (res.status === 401) {
    const ok = await refreshAccessToken()
    if (!ok) throw new Error('Sesión expirada')
    res = await doFetch()
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(Array.isArray(body.message) ? body.message[0] : (body.message ?? `Error (${res.status})`))
  }
  return res.json() as Promise<T>
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  error.value = null
  try {
    categories.value = await apiFetch<Category[]>('/api/users/categories')
    // Keep selectedCat in sync after reload
    if (selectedCat.value) {
      selectedCat.value = categories.value.find(c => c.id === selectedCat.value!.id) ?? null
    }
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function selectCat(cat: Category) {
  selectedCat.value = cat
}

// ─── Category modal ───────────────────────────────────────────────────────────

const catModal = reactive({
  show: false,
  editing: null as Category | null,
  name: '',
  icon: '',
  saving: false,
  error: null as string | null,
})

function openCatForm(cat?: Category) {
  catModal.editing = cat ?? null
  catModal.name    = cat?.name ?? ''
  catModal.icon    = cat?.icon ?? ''
  catModal.error   = null
  catModal.show    = true
}

async function saveCat() {
  catModal.saving = true
  catModal.error  = null
  try {
    const body = { name: catModal.name.trim(), icon: catModal.icon.trim() || undefined }
    if (catModal.editing) {
      await apiFetch(`/api/users/categories/${catModal.editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
    } else {
      await apiFetch('/api/users/categories', { method: 'POST', body: JSON.stringify(body) })
    }
    catModal.show = false
    await load()
  } catch (e: unknown) {
    catModal.error = (e as Error).message
  } finally {
    catModal.saving = false
  }
}

// ─── Subcategory modal ────────────────────────────────────────────────────────

const subModal = reactive({
  show: false,
  editing: null as Subcategory | null,
  name: '',
  saving: false,
  error: null as string | null,
})

function openSubForm(sub?: Subcategory) {
  subModal.editing = sub ?? null
  subModal.name    = sub?.name ?? ''
  subModal.error   = null
  subModal.show    = true
}

async function saveSub() {
  if (!selectedCat.value) return
  subModal.saving = true
  subModal.error  = null
  try {
    const body = { name: subModal.name.trim() }
    if (subModal.editing) {
      await apiFetch(`/api/users/subcategories/${subModal.editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
    } else {
      await apiFetch(`/api/users/categories/${selectedCat.value.id}/subcategories`, { method: 'POST', body: JSON.stringify(body) })
    }
    subModal.show = false
    await load()
  } catch (e: unknown) {
    subModal.error = (e as Error).message
  } finally {
    subModal.saving = false
  }
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

const deleteModal = reactive({
  show: false,
  type: 'cat' as 'cat' | 'sub',
  id: '',
  name: '',
  saving: false,
  error: null as string | null,
})

function confirmDeleteCat(cat: Category) {
  deleteModal.type  = 'cat'
  deleteModal.id    = cat.id
  deleteModal.name  = cat.name
  deleteModal.error = null
  deleteModal.show  = true
}

function confirmDeleteSub(sub: Subcategory) {
  deleteModal.type  = 'sub'
  deleteModal.id    = sub.id
  deleteModal.name  = sub.name
  deleteModal.error = null
  deleteModal.show  = true
}

async function doDelete() {
  deleteModal.saving = true
  deleteModal.error  = null
  try {
    const path = deleteModal.type === 'cat'
      ? `/api/users/categories/${deleteModal.id}`
      : `/api/users/subcategories/${deleteModal.id}`
    await apiFetch(path, { method: 'DELETE' })
    if (deleteModal.type === 'cat' && selectedCat.value?.id === deleteModal.id) {
      selectedCat.value = null
    }
    deleteModal.show = false
    await load()
  } catch (e: unknown) {
    deleteModal.error = (e as Error).message
  } finally {
    deleteModal.saving = false
  }
}

onMounted(load)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
