<template>
  <div>
    <!-- Toolbar -->
    <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
      <div class="flex gap-2">
        <button @click="gShowCatModal = true" class="flex items-center gap-2 px-4 py-2 bg-workplace-red text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nueva Categoría
        </button>
        <button @click="exportGlobal" class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Exportar CSV
        </button>
        <button @click="gShowImport = true" class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"/>
          </svg>
          Importar CSV
        </button>
      </div>
      <div class="relative">
        <input v-model="gSearch" type="text" placeholder="Buscar..."
          class="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red w-56"/>
        <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="gLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 6" :key="i" class="card-premium p-5 animate-pulse">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-2/3" />
            <div class="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
        <div class="space-y-2">
          <div class="h-3 bg-gray-200 rounded" />
          <div class="h-3 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="gFiltered.length === 0" class="text-center py-16">
      <span class="text-5xl block mb-3">📁</span>
      <p class="text-gray-500 text-sm">{{ gSearch ? 'Sin resultados para la búsqueda' : 'No hay categorías globales. Crea la primera.' }}</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="cat in gFiltered" :key="cat.id" class="card-premium p-5 hover:shadow-md transition-shadow">
        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              :style="{ backgroundColor: cat.color + '22' }">
              {{ cat.icon || '📁' }}
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 text-sm">{{ cat.name }}</h3>
              <p class="text-xs text-gray-400">{{ cat.subcategories?.length || 0 }} subcategorías</p>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button @click="gEditCat(cat)" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button @click="gConfirmDeleteCat(cat)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Descripción -->
        <p v-if="cat.description" class="text-xs text-gray-500 mb-3 line-clamp-2">{{ cat.description }}</p>

        <!-- Color dot -->
        <div class="flex items-center gap-2 mb-3">
          <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }"></span>
          <span class="text-xs text-gray-400 font-mono">{{ cat.color }}</span>
        </div>

        <!-- Subcategorías preview -->
        <div v-if="cat.subcategories?.length > 0" class="space-y-1 mb-3">
          <div v-for="sub in cat.subcategories.slice(0, 3)" :key="sub.id"
            class="flex items-center justify-between px-2 py-1 bg-gray-50 rounded-lg group">
            <span class="text-xs text-gray-600 truncate">{{ sub.name }}</span>
            <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="gEditSub(cat, sub)" class="p-0.5 text-gray-400 hover:text-blue-600 rounded transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button @click="gConfirmDeleteSub(sub)" class="p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
          <p v-if="cat.subcategories.length > 3" class="text-xs text-gray-400 text-center">+{{ cat.subcategories.length - 3 }} más</p>
        </div>

        <!-- Add subcategory -->
        <button @click="gOpenAddSub(cat)"
          class="w-full py-1.5 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-workplace-red hover:text-workplace-red transition-colors">
          + Agregar subcategoría
        </button>
      </div>
    </div>

    <!-- Modal categoría global -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="gShowCatModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="gCloseCatModal">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-sm">{{ gEditingCat ? 'Editar categoría global' : 'Nueva categoría global' }}</h3>
              <button @click="gCloseCatModal"><XMarkIcon class="w-5 h-5 text-gray-400"/></button>
            </div>
            <form @submit.prevent="gSaveCat" class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="gCatForm.name" required type="text" autofocus
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea v-model="gCatForm.description" rows="2"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red resize-none"></textarea>
              </div>
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Ícono</label>
                  <input v-model="gCatForm.icon" type="text" placeholder="📁" maxlength="4"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-center text-xl focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
                </div>
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <input v-model="gCatForm.color" type="color"
                    class="w-full h-10 border border-gray-200 rounded-xl cursor-pointer"/>
                </div>
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                  <input v-model.number="gCatForm.sortOrder" type="number" min="0"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
                </div>
              </div>
              <div v-if="gCatError" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{{ gCatError }}</div>
              <div class="flex gap-3">
                <button type="button" @click="gCloseCatModal" class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" :disabled="gCatSaving" class="flex-1 py-2 bg-workplace-red text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {{ gCatSaving ? 'Guardando...' : (gEditingCat ? 'Guardar' : 'Crear') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal subcategoría global -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="gShowSubModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="gCloseSubModal">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-sm">
                {{ gEditingSub ? 'Editar subcategoría' : 'Nueva subcategoría' }}
                <span class="font-normal text-gray-400 ml-1">en {{ gSubParentName }}</span>
              </h3>
              <button @click="gCloseSubModal"><XMarkIcon class="w-5 h-5 text-gray-400"/></button>
            </div>
            <form @submit.prevent="gSaveSub" class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="gSubForm.name" required type="text" autofocus
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <input v-model="gSubForm.description" type="text"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
              </div>
              <div v-if="gSubError" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{{ gSubError }}</div>
              <div class="flex gap-3">
                <button type="button" @click="gCloseSubModal" class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" :disabled="gSubSaving" class="flex-1 py-2 bg-workplace-red text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {{ gSubSaving ? 'Guardando...' : (gEditingSub ? 'Guardar' : 'Crear') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal importar CSV global -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="gShowImport" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="gShowImport = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-sm">Importar Categorías</h3>
              <button @click="gShowImport = false"><XMarkIcon class="w-5 h-5 text-gray-400"/></button>
            </div>
            <div class="p-5 space-y-4">
              <p class="text-xs text-gray-500">CSV con columnas: <code class="bg-gray-100 px-1 rounded">name,description,icon,color,sortOrder</code></p>
              <input type="file" accept=".csv" @change="(e: any) => gImportFile = e.target.files[0]" class="w-full text-sm"/>
              <div class="flex gap-3">
                <button @click="gShowImport = false" class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button @click="gImport" :disabled="!gImportFile" class="flex-1 py-2 bg-workplace-red text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">Importar</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface GSub { id: string; name: string; description?: string }
interface GCat { id: string; name: string; icon?: string; color: string; description?: string; sortOrder?: number; subcategories: GSub[] }

const { get, post, put, del } = useApi()
const { confirm } = useConfirm()
const toast = useToast()
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  type === 'error' ? toast.error(msg) : toast.success(msg)
}

const gLoading = ref(false)
const gCategories = ref<GCat[]>([])
const gSearch = ref('')

const gFiltered = computed(() => {
  if (!gSearch.value.trim()) return gCategories.value
  const q = gSearch.value.toLowerCase()
  return gCategories.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.description?.toLowerCase().includes(q) ||
    c.subcategories?.some(s => s.name.toLowerCase().includes(q))
  )
})

async function loadGlobal() {
  gLoading.value = true
  try {
    const res = await get<{ data: GCat[] }>('/categories-global')
    gCategories.value = res.data || []
  } catch (e: any) {
    showToast(e?.message || 'Error al cargar categorías globales', 'error')
  } finally {
    gLoading.value = false
  }
}

// Category form
const gShowCatModal = ref(false)
const gEditingCat   = ref<GCat | null>(null)
const gCatSaving    = ref(false)
const gCatError     = ref<string | null>(null)
const gCatForm      = reactive({ name: '', description: '', icon: '📁', color: '#6b7280', sortOrder: 0 })

function gEditCat(cat: GCat) {
  gEditingCat.value    = cat
  gCatForm.name        = cat.name
  gCatForm.description = cat.description || ''
  gCatForm.icon        = cat.icon || '📁'
  gCatForm.color       = cat.color || '#6b7280'
  gCatForm.sortOrder   = cat.sortOrder || 0
  gCatError.value      = null
  gShowCatModal.value  = true
}

function gCloseCatModal() {
  gShowCatModal.value  = false
  gEditingCat.value    = null
  gCatError.value      = null
  Object.assign(gCatForm, { name: '', description: '', icon: '📁', color: '#6b7280', sortOrder: 0 })
}

async function gSaveCat() {
  gCatSaving.value = true
  gCatError.value  = null
  try {
    if (gEditingCat.value) {
      await put(`/categories-global/${gEditingCat.value.id}`, { ...gCatForm })
      showToast('Categoría actualizada')
    } else {
      await post('/categories-global', { ...gCatForm })
      showToast('Categoría creada')
    }
    gCloseCatModal()
    await loadGlobal()
  } catch (e: any) {
    gCatError.value = e?.message || 'Error al guardar'
  } finally {
    gCatSaving.value = false
  }
}

async function gConfirmDeleteCat(cat: GCat) {
  const ok = await confirm({
    title: '¿Eliminar categoría global?',
    message: `Se eliminará ${cat.name}. Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await del(`/categories-global/${cat.id}`)
        await loadGlobal()
      } catch (e: any) {
        return e?.message || 'Error al eliminar'
      }
    },
  })
  if (ok) showToast('Eliminado correctamente')
}

// Subcategory form
const gShowSubModal  = ref(false)
const gEditingSub    = ref<GSub | null>(null)
const gSubParentId   = ref('')
const gSubParentName = ref('')
const gSubSaving     = ref(false)
const gSubError      = ref<string | null>(null)
const gSubForm       = reactive({ name: '', description: '' })

function gOpenAddSub(cat: GCat) {
  gEditingSub.value    = null
  gSubParentId.value   = cat.id
  gSubParentName.value = cat.name
  gSubForm.name        = ''
  gSubForm.description = ''
  gSubError.value      = null
  gShowSubModal.value  = true
}

function gEditSub(cat: GCat, sub: GSub) {
  gEditingSub.value    = sub
  gSubParentId.value   = cat.id
  gSubParentName.value = cat.name
  gSubForm.name        = sub.name
  gSubForm.description = sub.description || ''
  gSubError.value      = null
  gShowSubModal.value  = true
}

function gCloseSubModal() {
  gShowSubModal.value  = false
  gEditingSub.value    = null
  gSubError.value      = null
  gSubForm.name        = ''
  gSubForm.description = ''
}

async function gSaveSub() {
  gSubSaving.value = true
  gSubError.value  = null
  try {
    if (gEditingSub.value) {
      await put(`/categories-global/subcategories/${gEditingSub.value.id}`, { ...gSubForm })
      showToast('Subcategoría actualizada')
    } else {
      await post(`/categories-global/${gSubParentId.value}/subcategories`, { ...gSubForm })
      showToast('Subcategoría creada')
    }
    gCloseSubModal()
    await loadGlobal()
  } catch (e: any) {
    gSubError.value = e?.message || 'Error al guardar'
  } finally {
    gSubSaving.value = false
  }
}

async function gConfirmDeleteSub(sub: GSub) {
  const ok = await confirm({
    title: '¿Eliminar subcategoría global?',
    message: `Se eliminará ${sub.name}. Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await del(`/categories-global/subcategories/${sub.id}`)
        await loadGlobal()
      } catch (e: any) {
        return e?.message || 'Error al eliminar'
      }
    },
  })
  if (ok) showToast('Eliminado correctamente')
}

// Export / Import
async function exportGlobal() {
  try {
    const csv = await get<string>('/categories-global/export/csv')
    const a   = document.createElement('a')
    a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'categorias-globales.csv'
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('Categorías exportadas')
  } catch (e: any) {
    showToast(e?.message || 'Error al exportar', 'error')
  }
}

const gShowImport  = ref(false)
const gImportFile  = ref<File | null>(null)

async function gImport() {
  if (!gImportFile.value) return
  try {
    const text  = await gImportFile.value.text()
    const lines = text.split('\n').filter(l => l.trim())
    const rows  = lines.slice(1).map(l => {
      const v = l.split(',')
      return { name: v[0]?.trim(), description: v[1]?.trim(), icon: v[2]?.trim() || '📁', color: v[3]?.trim() || '#6b7280', sortOrder: parseInt(v[4]) || 0 }
    }).filter(r => r.name)
    await post('/categories-global/import/csv', { categories: rows })
    showToast(`${rows.length} categorías importadas`)
    gShowImport.value = false
    gImportFile.value = null
    await loadGlobal()
  } catch (e: any) {
    showToast(e?.message || 'Error al importar', 'error')
  }
}

onMounted(loadGlobal)
</script>
