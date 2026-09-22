<template>
  <div>
    <!-- Error -->
    <div v-if="uError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      {{ uError }}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Panel izquierdo: Categorías -->
      <div class="card-premium overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 class="text-sm font-bold text-gray-800">Categorías</h2>
          <button @click="openCatForm()" class="flex items-center gap-1.5 px-3 py-1.5 bg-workplace-red text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nueva
          </button>
        </div>

        <div v-if="uLoading" class="divide-y divide-gray-50">
          <div v-for="i in 5" :key="i" class="px-5 py-4 animate-pulse flex gap-3">
            <div class="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-2/3" />
              <div class="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>

        <div v-else-if="uCategories.length === 0" class="px-5 py-10 text-center text-gray-400 text-sm">
          Sin categorías. Crea la primera.
        </div>

        <div v-else class="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          <div
            v-for="cat in uCategories"
            :key="cat.id"
            class="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-l-4"
            :class="uSelectedCat?.id === cat.id ? 'bg-red-50 border-l-workplace-red' : 'border-l-transparent'"
            @click="uSelectedCat = cat"
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
              <button @click.stop="openCatForm(cat)" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button @click.stop="confirmDeleteCat(cat)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel derecho: Subcategorías -->
      <div class="card-premium overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 class="text-sm font-bold text-gray-800">
            Subcategorías
            <span v-if="uSelectedCat" class="font-normal text-gray-400 ml-1">— {{ uSelectedCat.name }}</span>
          </h2>
          <button v-if="uSelectedCat" @click="openSubForm()" class="flex items-center gap-1.5 px-3 py-1.5 bg-workplace-red text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nueva
          </button>
        </div>

        <div v-if="!uSelectedCat" class="px-5 py-16 text-center text-gray-400 text-sm">
          <svg class="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          Selecciona una categoría para ver sus subcategorías
        </div>

        <div v-else-if="uSelectedCat.subcategories.length === 0" class="px-5 py-10 text-center text-gray-400 text-sm">
          Sin subcategorías. Crea la primera.
        </div>

        <div v-else class="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          <div v-for="sub in uSelectedCat.subcategories" :key="sub.id" class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
            <span class="text-lg flex-shrink-0 w-6 text-center">{{ sub.icon || '📄' }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-gray-700">{{ sub.name }}</div>
              <div v-if="sub.description" class="text-xs text-gray-400 truncate">{{ sub.description }}</div>
            </div>
            <div class="flex gap-1">
              <button @click="openSubForm(sub)" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button @click="confirmDeleteSub(sub)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal categoría usuario -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="catModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="catModal.show = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-sm">{{ catModal.editing ? 'Editar categoría' : 'Nueva categoría' }}</h3>
              <button @click="catModal.show = false"><XMarkIcon class="w-5 h-5 text-gray-400"/></button>
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
                    <button v-for="e in EMOJI_SUGGESTIONS" :key="e" type="button" @click="catModal.icon = e"
                      class="text-xl hover:scale-125 transition-transform"
                      :class="catModal.icon === e ? 'ring-2 ring-workplace-red rounded' : ''">{{ e }}</button>
                  </div>
                </div>
              </div>
              <div v-if="catModal.error" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{{ catModal.error }}</div>
              <div class="flex gap-3">
                <button type="button" @click="catModal.show = false" class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" :disabled="catModal.saving" class="flex-1 py-2 bg-workplace-red text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {{ catModal.saving ? 'Guardando...' : (catModal.editing ? 'Guardar' : 'Crear') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal subcategoría usuario -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="subModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="subModal.show = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-sm">
                {{ subModal.editing ? 'Editar subcategoría' : 'Nueva subcategoría' }}
                <span class="font-normal text-gray-400 ml-1">en {{ uSelectedCat?.name }}</span>
              </h3>
              <button @click="subModal.show = false"><XMarkIcon class="w-5 h-5 text-gray-400"/></button>
            </div>
            <form @submit.prevent="saveSub" class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="subModal.name" required type="text" autofocus
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Ícono (emoji)</label>
                <div class="flex gap-2">
                  <input v-model="subModal.icon" type="text" placeholder="📄" maxlength="4"
                    class="w-20 border border-gray-200 rounded-xl px-3 py-2 text-center text-xl focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
                  <div class="flex flex-wrap gap-1.5 items-center">
                    <button v-for="e in EMOJI_SUGGESTIONS" :key="e" type="button" @click="subModal.icon = e"
                      class="text-xl hover:scale-125 transition-transform"
                      :class="subModal.icon === e ? 'ring-2 ring-workplace-red rounded' : ''">{{ e }}</button>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Descripción <span class="text-gray-400 font-normal">(opcional)</span></label>
                <textarea v-model="subModal.description" rows="2" maxlength="300"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red resize-none"/>
              </div>
              <div v-if="subModal.error" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{{ subModal.error }}</div>
              <div class="flex gap-3">
                <button type="button" @click="subModal.show = false" class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" :disabled="subModal.saving" class="flex-1 py-2 bg-workplace-red text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {{ subModal.saving ? 'Guardando...' : (subModal.editing ? 'Guardar' : 'Crear') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface USub { id: string; name: string; icon?: string; description?: string }
interface UCat { id: string; name: string; icon?: string; subcategories: USub[]; _count: { users: number } }

const { get, post, put, del } = useApi()
const { confirm } = useConfirm()
const toast = useToast()
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  type === 'error' ? toast.error(msg) : toast.success(msg)
}

const uLoading    = ref(false)
const uError      = ref<string | null>(null)
const uCategories = ref<UCat[]>([])
const uSelectedCat = ref<UCat | null>(null)

const EMOJI_SUGGESTIONS = ['🍔','🍕','☕','🥗','🍰','💻','📱','🛍️','👗','💄','🏥','💊','📚','🎬','🎵','🏠','🚗','💰','🔧','⚖️']

async function loadUsers() {
  uLoading.value = true
  uError.value = null
  try {
    uCategories.value = await get<UCat[]>('/users/categories')
    if (uSelectedCat.value) {
      uSelectedCat.value = uCategories.value.find(c => c.id === uSelectedCat.value!.id) ?? null
    }
  } catch (e: any) {
    uError.value = e?.message || 'Error al cargar categorías'
  } finally {
    uLoading.value = false
  }
}

// Category modal
const catModal = reactive({
  show: false, editing: null as UCat | null,
  name: '', icon: '', saving: false, error: null as string | null,
})

function openCatForm(cat?: UCat) {
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
      await put(`/users/categories/${catModal.editing.id}`, body)
    } else {
      await post('/users/categories', body)
    }
    catModal.show = false
    showToast(catModal.editing ? 'Categoría actualizada' : 'Categoría creada')
    await loadUsers()
  } catch (e: any) {
    catModal.error = e?.message || 'Error al guardar'
  } finally {
    catModal.saving = false
  }
}

// Subcategory modal
const subModal = reactive({
  show: false, editing: null as USub | null,
  name: '', icon: '', description: '', saving: false, error: null as string | null,
})

function openSubForm(sub?: USub) {
  subModal.editing      = sub ?? null
  subModal.name         = sub?.name ?? ''
  subModal.icon         = sub?.icon ?? ''
  subModal.description  = sub?.description ?? ''
  subModal.error        = null
  subModal.show         = true
}

async function saveSub() {
  if (!uSelectedCat.value) return
  subModal.saving = true
  subModal.error  = null
  try {
    const body = {
      name: subModal.name.trim(),
      icon: subModal.icon.trim() || undefined,
      description: subModal.description.trim() || undefined,
    }
    if (subModal.editing) {
      await put(`/users/subcategories/${subModal.editing.id}`, body)
    } else {
      await post(`/users/categories/${uSelectedCat.value.id}/subcategories`, body)
    }
    subModal.show = false
    showToast(subModal.editing ? 'Subcategoría actualizada' : 'Subcategoría creada')
    await loadUsers()
  } catch (e: any) {
    subModal.error = e?.message || 'Error al guardar'
  } finally {
    subModal.saving = false
  }
}

async function confirmDeleteCat(cat: UCat) {
  const ok = await confirm({
    title: '¿Eliminar categoría?',
    message: `Se eliminará ${cat.name}. Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await del(`/users/categories/${cat.id}`)
        if (uSelectedCat.value?.id === cat.id) uSelectedCat.value = null
        await loadUsers()
      } catch (e: any) {
        return e?.message || 'Error al eliminar'
      }
    },
  })
  if (ok) showToast('Eliminado correctamente')
}

async function confirmDeleteSub(sub: USub) {
  const ok = await confirm({
    title: '¿Eliminar subcategoría?',
    message: `Se eliminará ${sub.name}. Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await del(`/users/subcategories/${sub.id}`)
        await loadUsers()
      } catch (e: any) {
        return e?.message || 'Error al eliminar'
      }
    },
  })
  if (ok) showToast('Eliminado correctamente')
}

onMounted(loadUsers)
</script>
