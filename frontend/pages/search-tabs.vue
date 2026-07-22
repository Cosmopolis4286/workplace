<template>
  <div>
    <PageHeader
      title="Tabs de Búsqueda"
      description="Configura las opciones que aparecen en la página de búsqueda"
      :icon="MagnifyingGlassIcon"
      :breadcrumb="[{ label: 'Configuración', to: '/configuracion' }, { label: 'Tabs de Búsqueda' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openCreateModal">
          Nuevo Tab
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- Vista previa -->
    <div class="card p-5 mb-6">
      <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vista previa</p>
      <div class="flex flex-wrap gap-2 bg-gradient-to-r from-workplace-red to-red-600 rounded-2xl p-2">
        <div
          v-for="tab in previewTabs"
          :key="tab.id"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          :class="tab.isEnabled ? 'bg-white shadow-sm' : 'text-white/50 line-through'"
          :style="tab.isEnabled ? `color: ${tab.color}` : ''"
        >
          <svg v-if="tab.icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
          </svg>
          {{ tab.label }}
        </div>
        <p v-if="previewTabs.length === 0" class="text-white/70 text-sm py-2 px-2">Sin tabs configurados</p>
      </div>
      <p class="text-xs text-gray-400 mt-2">Así se verán los tabs en la barra de búsqueda. Los tabs inactivos no se muestran a los usuarios.</p>
    </div>

    <!-- Filtros -->
    <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input v-model="searchQuery" type="text" placeholder="Buscar por etiqueta o key..." class="input-field pl-9" />
      </div>
      <select v-model="filterStatus" class="input-field w-auto">
        <option value="">Todos los estados</option>
        <option value="enabled">Activos</option>
        <option value="disabled">Inactivos</option>
      </select>
      <button v-if="searchQuery || filterStatus" class="text-sm text-gray-400 hover:text-gray-600" @click="searchQuery = ''; filterStatus = ''">Limpiar</button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid gap-4">
      <div v-for="n in 3" :key="n" class="card p-5 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="skeleton w-12 h-12 rounded-xl" />
          <div class="flex-1 space-y-2">
            <div class="skeleton h-4 w-32 rounded" />
            <div class="skeleton h-3 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredTabs.length === 0 && tabs.length === 0" class="card p-12 text-center">
      <MagnifyingGlassIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">Sin tabs configurados</p>
      <p class="text-sm text-gray-400 mt-1">Crea el primer tab de búsqueda</p>
      <button class="btn-primary mt-4" @click="openCreateModal">
        <PlusIcon class="h-4 w-4 inline mr-1.5" />Crear Tab
      </button>
    </div>

    <!-- Sin resultados de filtro -->
    <div v-else-if="filteredTabs.length === 0" class="card p-12 text-center">
      <MagnifyingGlassIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">Sin resultados</p>
      <p class="text-sm text-gray-400 mt-1">Ajusta tu búsqueda o filtros</p>
    </div>

    <!-- Tab list -->
    <div v-else class="grid gap-4">
      <div
        v-for="tab in filteredTabs"
        :key="tab.id"
        class="card p-5 flex items-center gap-4 group"
        :class="!tab.isEnabled && 'opacity-60'"
      >
        <!-- Color swatch + icon preview -->
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          :style="{ backgroundColor: tab.color }"
        >
          <svg v-if="tab.icon" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
          </svg>
          <span v-else class="text-white font-black text-base">{{ tab.label[0] }}</span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5 flex-wrap">
            <span class="font-bold text-gray-900 text-sm">{{ tab.label }}</span>
            <span class="text-xs text-gray-400 font-mono">{{ tab.key }}</span>
            <span v-if="SYSTEM_KEYS.includes(tab.key)" class="badge bg-blue-100 text-blue-700">Sistema</span>
            <span class="badge" :class="tab.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
              {{ tab.isEnabled ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <span>Orden: {{ tab.sortOrder + 1 }}</span>
            <span>·</span>
            <span :style="{ color: tab.color }" class="font-mono">{{ tab.color }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Move up -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="isFirst(tab)"
            title="Subir"
            @click="moveTab(tab, 'up')"
          >
            <ChevronUpIcon class="w-4 h-4" />
          </button>
          <!-- Move down -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="isLast(tab)"
            title="Bajar"
            @click="moveTab(tab, 'down')"
          >
            <ChevronDownIcon class="w-4 h-4" />
          </button>
          <!-- Toggle -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors"
            :class="tab.isEnabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'"
            :title="tab.isEnabled ? 'Desactivar' : 'Activar'"
            @click="toggleTab(tab)"
          >
            <EyeIcon v-if="tab.isEnabled" class="w-4 h-4" />
            <EyeSlashIcon v-else class="w-4 h-4" />
          </button>
          <!-- Edit -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="Editar"
            @click="openEditModal(tab)"
          >
            <PencilIcon class="w-4 h-4" />
          </button>
          <!-- Delete (only non-system keys) -->
          <button
            v-if="!SYSTEM_KEYS.includes(tab.key)"
            class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            title="Eliminar"
            @click="confirmDelete(tab)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Modal Crear / Editar ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeModal"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 class="text-lg font-black text-gray-900">{{ editingTab ? 'Editar Tab' : 'Nuevo Tab' }}</h2>
              <button class="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors" @click="closeModal">
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <form class="p-6 space-y-5" @submit.prevent="saveTab">
              <!-- Key (only on create) -->
              <div v-if="!editingTab">
                <label class="block text-xs font-bold text-gray-600 mb-1.5">Key (identificador único) <span class="text-red-500">*</span></label>
                <input
                  v-model="form.key"
                  type="text"
                  placeholder="ej: productos, servicios, marketplace"
                  class="input-field"
                  required
                  pattern="[a-z0-9_-]+"
                  title="Solo letras minúsculas, números, guiones y guiones bajos"
                />
                <p class="text-xs text-gray-400 mt-1">Solo letras minúsculas, números, - y _</p>
              </div>

              <!-- Label -->
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1.5">Etiqueta <span class="text-red-500">*</span></label>
                <input
                  v-model="form.label"
                  type="text"
                  placeholder="ej: Productos, Servicios, Empleos"
                  class="input-field"
                  required
                />
              </div>

              <!-- Color -->
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1.5">Color del tab</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="form.color"
                    type="color"
                    class="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    v-model="form.color"
                    type="text"
                    placeholder="#EF4444"
                    class="flex-1 input-field font-mono"
                  />
                  <!-- Preview -->
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    :style="{ backgroundColor: form.color || '#EF4444' }"
                  >
                    <svg v-if="form.icon" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="form.icon" />
                    </svg>
                    <span v-else class="text-white font-black text-sm">{{ (form.label || 'T')[0] }}</span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-2">
                  <button
                    v-for="c in PRESET_COLORS"
                    :key="c"
                    type="button"
                    class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    :class="form.color === c ? 'border-gray-700' : 'border-transparent'"
                    :style="{ backgroundColor: c }"
                    @click="form.color = c"
                  />
                </div>
              </div>

              <!-- Icon path (SVG d attribute) -->
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1.5">Icono SVG (atributo "d" del path)</label>
                <textarea
                  v-model="form.icon"
                  rows="2"
                  placeholder="M4 6a2 2 0 012-2h2..."
                  class="input-field text-xs font-mono resize-none"
                />
                <p class="text-xs text-gray-400 mt-1">Pega el valor del atributo <code>d</code> de un SVG 24x24 de Heroicons</p>
              </div>

              <!-- Enabled -->
              <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p class="text-sm font-bold text-gray-700">Activo</p>
                  <p class="text-xs text-gray-400">Visible en la página de búsqueda</p>
                </div>
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  :class="form.isEnabled ? 'bg-red-600' : 'bg-gray-200'"
                  @click="form.isEnabled = !form.isEnabled"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                    :class="form.isEnabled ? 'translate-x-6' : 'translate-x-1'"
                  />
                </button>
              </div>

              <!-- Footer -->
              <div class="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  @click="closeModal"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="flex-1 btn-primary disabled:opacity-60 flex items-center justify-center gap-2 py-2.5"
                  :disabled="saving"
                >
                  <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {{ saving ? 'Guardando...' : (editingTab ? 'Guardar cambios' : 'Crear tab') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ─── Modal Confirmar Eliminar ──────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="tabToDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="tabToDelete = null">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="tabToDelete = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div class="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrashIcon class="w-6 h-6 text-red-600" />
            </div>
            <h3 class="text-base font-black text-gray-900 text-center mb-2">Eliminar tab</h3>
            <p class="text-sm text-gray-500 text-center mb-6">
              ¿Eliminar el tab <strong>{{ tabToDelete.label }}</strong>? Esta acción no se puede deshacer.
            </p>
            <div class="flex gap-3">
              <button class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors" @click="tabToDelete = null">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60" :disabled="saving" @click="deleteTab">
                {{ saving ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast" class="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl">
          <CheckCircleIcon class="w-4 h-4 text-green-400" />
          {{ toast }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  MagnifyingGlassIcon, PlusIcon, XMarkIcon, PencilIcon, TrashIcon,
  ChevronUpIcon, ChevronDownIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import { useSearchTabs, type SearchTab } from '~/composables/useSearchTabs'

definePageMeta({ middleware: 'auth' })

const SYSTEM_KEYS = ['productos', 'servicios', 'empleos']
const PRESET_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']

const { adminLoadAll, adminCreate, adminUpdate, adminToggle, adminReorder, adminDelete } = useSearchTabs()

const tabs = ref<SearchTab[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const toast = ref<string | null>(null)

const showModal = ref(false)
const editingTab = ref<SearchTab | null>(null)
const tabToDelete = ref<SearchTab | null>(null)

const searchQuery = ref('')
const filterStatus = ref('')

const form = reactive({
  key: '',
  label: '',
  icon: '',
  color: '#EF4444',
  isEnabled: true,
})

// ─── Computed ─────────────────────────────────────────────────────────────────

const sortedTabs = computed(() => [...tabs.value].sort((a, b) => a.sortOrder - b.sortOrder))

const filteredTabs = computed(() => {
  let list = sortedTabs.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t => t.label.toLowerCase().includes(q) || t.key.toLowerCase().includes(q))
  }
  if (filterStatus.value === 'enabled') list = list.filter(t => t.isEnabled)
  if (filterStatus.value === 'disabled') list = list.filter(t => !t.isEnabled)
  return list
})

const previewTabs = computed(() => sortedTabs.value)

const headerStats = computed(() => [
  { label: 'Total',     value: String(tabs.value.length) },
  { label: 'Activos',   value: String(tabs.value.filter(t => t.isEnabled).length) },
  { label: 'Inactivos', value: String(tabs.value.filter(t => !t.isEnabled).length) },
  { label: 'Sistema',   value: String(tabs.value.filter(t => SYSTEM_KEYS.includes(t.key)).length) },
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFirst(tab: SearchTab) {
  return sortedTabs.value[0]?.id === tab.id
}

function isLast(tab: SearchTab) {
  return sortedTabs.value[sortedTabs.value.length - 1]?.id === tab.id
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = null }, 3000)
}

// ─── Data loading ───────────────────────────────────────────────────────────

async function loadTabs() {
  loading.value = true
  error.value = null
  try {
    tabs.value = await adminLoadAll()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ─── Modal Crear/Editar ───────────────────────────────────────────────────────

function openCreateModal() {
  editingTab.value = null
  form.key = ''
  form.label = ''
  form.icon = ''
  form.color = '#EF4444'
  form.isEnabled = true
  showModal.value = true
}

function openEditModal(tab: SearchTab) {
  editingTab.value = tab
  form.key = tab.key
  form.label = tab.label
  form.icon = tab.icon ?? ''
  form.color = tab.color
  form.isEnabled = tab.isEnabled
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingTab.value = null
}

async function saveTab() {
  saving.value = true
  error.value = null
  try {
    if (editingTab.value) {
      const updated = await adminUpdate(editingTab.value.id, {
        label: form.label,
        icon: form.icon || null,
        color: form.color,
        isEnabled: form.isEnabled,
      })
      const idx = tabs.value.findIndex(t => t.id === updated.id)
      if (idx !== -1) tabs.value[idx] = updated
      showToast('Tab actualizado')
    } else {
      const created = await adminCreate({
        key: form.key,
        label: form.label,
        icon: form.icon || null,
        color: form.color,
        isEnabled: form.isEnabled,
        sortOrder: tabs.value.length,
      })
      tabs.value.push(created)
      showToast('Tab creado')
    }
    closeModal()
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

// ─── Toggle / Reorder / Delete ─────────────────────────────────────────────────

async function toggleTab(tab: SearchTab) {
  try {
    const updated = await adminToggle(tab.id)
    const idx = tabs.value.findIndex(t => t.id === tab.id)
    if (idx !== -1) tabs.value[idx] = updated
    showToast(updated.isEnabled ? 'Tab activado' : 'Tab desactivado')
  } catch (e: any) {
    error.value = e.message
  }
}

async function moveTab(tab: SearchTab, direction: 'up' | 'down') {
  const sorted = sortedTabs.value
  const idx = sorted.findIndex(t => t.id === tab.id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= sorted.length) return

  const reorderedIds = [...sorted.map(t => t.id)]
  ;[reorderedIds[idx], reorderedIds[swapIdx]] = [reorderedIds[swapIdx], reorderedIds[idx]]

  try {
    const reordered = await adminReorder(reorderedIds)
    tabs.value = reordered
    showToast('Orden actualizado')
  } catch (e: any) {
    error.value = e.message
  }
}

function confirmDelete(tab: SearchTab) {
  tabToDelete.value = tab
}

async function deleteTab() {
  if (!tabToDelete.value) return
  saving.value = true
  try {
    await adminDelete(tabToDelete.value.id)
    tabs.value = tabs.value.filter(t => t.id !== tabToDelete.value!.id)
    tabToDelete.value = null
    showToast('Tab eliminado')
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(loadTabs)
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold;
}
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px); }
</style>
