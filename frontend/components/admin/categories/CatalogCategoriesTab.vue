<template>
  <div>
    <!-- Toolbar -->
    <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
      <button @click="openForm()" class="flex items-center gap-2 px-4 py-2 bg-workplace-red text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        {{ createLabel }}
      </button>
      <div class="relative">
        <input v-model="search" type="text" placeholder="Buscar..."
          class="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red w-56"/>
        <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 6" :key="i" class="card-premium p-5 animate-pulse">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-2/3" />
            <div class="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
        <div class="h-3 bg-gray-200 rounded w-3/4" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="text-center py-16">
      <span class="text-5xl block mb-3">{{ emptyIcon }}</span>
      <p class="text-gray-500 text-sm">{{ search ? 'Sin resultados para la búsqueda' : emptyMessage }}</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="cat in filtered" :key="cat.id" class="card-premium p-5 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              :style="{ backgroundColor: (cat.color || '#6b7280') + '22' }">
              {{ cat.icon || emptyIcon }}
            </div>
            <div class="min-w-0">
              <h3 class="font-semibold text-gray-900 text-sm truncate">{{ cat.name }}</h3>
              <p v-if="cat.description" class="text-xs text-gray-400 truncate">{{ cat.description }}</p>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button @click="openForm(cat)" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button @click="confirmDelete(cat)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Rubros a los que aplica -->
        <div class="flex flex-wrap gap-1">
          <span v-if="cat.userCategoryIds.length === 0" class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
            Todos los rubros
          </span>
          <span
            v-for="ucId in cat.userCategoryIds"
            :key="ucId"
            class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
          >
            {{ userCategoryName(ucId) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Modal crear/editar -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="closeForm">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 class="font-bold text-gray-900 text-sm">{{ editing ? `Editar ${singularLabel}` : `Nueva ${singularLabel}` }}</h3>
              <button @click="closeForm"><XMarkIcon class="w-5 h-5 text-gray-400"/></button>
            </div>
            <form @submit.prevent="save" class="p-5 space-y-4 overflow-y-auto">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="form.name" required type="text" autofocus
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
              </div>

              <div v-if="kind === 'jobs'">
                <label class="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea v-model="form.description" rows="2"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red resize-none"></textarea>
              </div>

              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Ícono</label>
                  <input v-model="form.icon" type="text" placeholder="🏷️" maxlength="4"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-center text-xl focus:outline-none focus:ring-2 focus:ring-workplace-red/30 focus:border-workplace-red"/>
                </div>
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <input v-model="form.color" type="color"
                    class="w-full h-10 border border-gray-200 rounded-xl cursor-pointer"/>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1.5">
                  Rubros de negocio
                  <span class="font-normal text-gray-400">(vacío = visible para todos)</span>
                </label>
                <div class="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-0.5">
                  <label
                    v-for="uc in userCategories"
                    :key="uc.id"
                    class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input type="checkbox" :value="uc.id" v-model="form.userCategoryIds" class="rounded text-workplace-red focus:ring-workplace-red/30"/>
                    <span>{{ uc.icon || '🏢' }} {{ uc.name }}</span>
                  </label>
                  <p v-if="userCategories.length === 0" class="text-xs text-gray-400 px-2 py-1.5">Sin rubros de negocio configurados.</p>
                </div>
              </div>

              <div v-if="formError" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{{ formError }}</div>
              <div class="flex gap-3 pt-1">
                <button type="button" @click="closeForm" class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" :disabled="saving" class="flex-1 py-2 bg-workplace-red text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {{ saving ? 'Guardando...' : (editing ? 'Guardar' : 'Crear') }}
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
import { ref, reactive, computed, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useCatalogCategoriesAdmin, type CatalogAdminCategory, type CatalogKind } from '~/composables/admin/useCatalogCategoriesAdmin'
import { useUsers } from '~/composables/users/useUsers'

const props = defineProps<{
  kind: CatalogKind
}>()

const { confirm } = useConfirm()
const toast = useToast()
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  type === 'error' ? toast.error(msg) : toast.success(msg)
}

const { categories, loading, fetchAll, create, update, remove } = useCatalogCategoriesAdmin(props.kind)
const { loadCategories: loadUserCategories } = useUsers()

const userCategories = ref<{ id: string; name: string; icon?: string }[]>([])
const search = ref('')

const singularLabel = computed(() => props.kind === 'services' ? 'categoría de servicio' : 'categoría de empleo')
const createLabel = computed(() => props.kind === 'services' ? 'Nueva Categoría de Servicio' : 'Nueva Categoría de Empleo')
const emptyIcon = computed(() => props.kind === 'services' ? '🧰' : '💼')
const emptyMessage = computed(() => props.kind === 'services'
  ? 'No hay categorías de servicio. Crea la primera.'
  : 'No hay categorías de empleo. Crea la primera.')

const filtered = computed(() => {
  if (!search.value.trim()) return categories.value
  const q = search.value.toLowerCase()
  return categories.value.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
})

function userCategoryName(id: string): string {
  const uc = userCategories.value.find(u => u.id === id)
  return uc ? `${uc.icon || '🏢'} ${uc.name}` : '—'
}

// Form
const showForm = ref(false)
const editing  = ref<CatalogAdminCategory | null>(null)
const saving   = ref(false)
const formError = ref<string | null>(null)
const form = reactive({ name: '', description: '', icon: '🏷️', color: '#6b7280', userCategoryIds: [] as string[] })

function openForm(cat?: CatalogAdminCategory) {
  editing.value = cat ?? null
  form.name = cat?.name ?? ''
  form.description = cat?.description ?? ''
  form.icon = cat?.icon ?? '🏷️'
  form.color = cat?.color ?? '#6b7280'
  form.userCategoryIds = [...(cat?.userCategoryIds ?? [])]
  formError.value = null
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
  formError.value = null
}

async function save() {
  saving.value = true
  formError.value = null
  try {
    const dto = {
      name: form.name.trim(),
      icon: form.icon.trim() || undefined,
      color: form.color,
      description: props.kind === 'jobs' ? (form.description.trim() || undefined) : undefined,
      userCategoryIds: form.userCategoryIds,
    }
    if (editing.value) {
      await update(editing.value.id, dto)
      showToast(`${singularLabel.value} actualizada`)
    } else {
      await create(dto)
      showToast(`${singularLabel.value} creada`)
    }
    closeForm()
  } catch (e: any) {
    formError.value = e?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

async function confirmDelete(cat: CatalogAdminCategory) {
  const ok = await confirm({
    title: `¿Eliminar ${singularLabel.value}?`,
    message: `Se eliminará "${cat.name}". Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await remove(cat.id)
      } catch (e: any) {
        return e?.message || 'Error al eliminar'
      }
    },
  })
  if (ok) showToast('Eliminado correctamente')
}

onMounted(async () => {
  await Promise.all([fetchAll(), loadUserCategories().then(cats => { userCategories.value = cats })])
})
</script>
