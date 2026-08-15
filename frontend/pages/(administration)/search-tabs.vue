<template>
  <div>
    <PageHeader
      title="Tabs de Búsqueda"
      description="Configura las opciones que aparecen en la página de búsqueda"
      :icon="MagnifyingGlassIcon"
      :breadcrumb="[{ label: 'Configuración', to: '/settings' }, { label: 'Tabs de Búsqueda' }]"
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

    <SearchTabsPreview :tabs="previewTabs" />

    <SearchTabsFiltersBar
      :search-query="searchQuery"
      :filter-status="filterStatus"
      @update:search-query="searchQuery = $event"
      @update:filter-status="filterStatus = $event"
      @clear="searchQuery = ''; filterStatus = ''"
    />

    <SearchTabsList
      :tabs="filteredTabs"
      :total-tabs="tabs.length"
      :loading="loading"
      :system-keys="SYSTEM_KEYS"
      :is-first="isFirst"
      :is-last="isLast"
      @create="openCreateModal"
      @edit="openEditModal"
      @delete="confirmDelete"
      @toggle="toggleTab"
      @move="moveTab"
    />

    <SearchTabFormModal
      :show="showModal"
      :editing="!!editingTab"
      :saving="saving"
      :form="form"
      :preset-colors="PRESET_COLORS"
      @close="closeModal"
      @submit="saveTab"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import SearchTabsPreview from '~/components/admin/search-tabs/SearchTabsPreview.vue'
import SearchTabsFiltersBar from '~/components/admin/search-tabs/SearchTabsFiltersBar.vue'
import SearchTabsList from '~/components/admin/search-tabs/SearchTabsList.vue'
import SearchTabFormModal from '~/components/admin/search-tabs/SearchTabFormModal.vue'
import { useSearchTabs, type SearchTab } from '~/composables/search/useSearchTabs'
import { useConfirm } from '~/composables/ui/useConfirm'

definePageMeta({ middleware: 'auth' })

const SYSTEM_KEYS = ['productos', 'servicios', 'empleos']
const PRESET_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']

const { adminLoadAll, adminCreate, adminUpdate, adminToggle, adminReorder, adminDelete } = useSearchTabs()

const tabs = ref<SearchTab[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const showModal = ref(false)
const editingTab = ref<SearchTab | null>(null)
const { confirm } = useConfirm()

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

const toastApi = useToast()
function showToast(msg: string) { toastApi.success(msg) }

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

async function confirmDelete(tab: SearchTab) {
  const ok = await confirm({
    title: 'Eliminar tab',
    message: `¿Eliminar el tab ${tab.label}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await adminDelete(tab.id)
        tabs.value = tabs.value.filter(t => t.id !== tab.id)
      } catch (e: any) {
        return e.message
      }
    },
  })
  if (ok) showToast('Tab eliminado')
}

onMounted(loadTabs)
</script>
