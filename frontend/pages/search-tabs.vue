<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-black text-gray-900">Tabs de Búsqueda</h1>
          <p class="text-sm text-gray-500 mt-1">Configura las opciones que aparecen en la página de búsqueda</p>
        </div>
        <button
          class="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
          @click="openCreateModal"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Nuevo Tab
        </button>
      </div>

      <!-- Error banner -->
      <div v-if="error" class="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {{ error }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="grid gap-4">
        <div v-for="n in 3" :key="n" class="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-gray-100" />
            <div class="flex-1">
              <div class="h-4 bg-gray-100 rounded w-32 mb-2" />
              <div class="h-3 bg-gray-100 rounded w-20" />
            </div>
          </div>
        </div>
      </div>

      <!-- Tab list -->
      <div v-else-if="tabs.length > 0" class="grid gap-4">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 group"
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
            <div class="flex items-center gap-2 mb-0.5">
              <span class="font-bold text-gray-900 text-sm">{{ tab.label }}</span>
              <span class="text-xs text-gray-400 font-mono">{{ tab.key }}</span>
              <span
                class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                :class="tab.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ tab.isEnabled ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-400">
              <span>Orden: {{ tab.sortOrder }}</span>
              <span>·</span>
              <span :style="{ color: tab.color }">{{ tab.color }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <!-- Move up -->
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30"
              :disabled="tab.sortOrder === 0"
              title="Subir"
              @click="moveTab(tab.id, 'up')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
              </svg>
            </button>
            <!-- Move down -->
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30"
              :disabled="tab.sortOrder >= tabs.length - 1"
              title="Bajar"
              @click="moveTab(tab.id, 'down')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <!-- Toggle -->
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors"
              :class="tab.isEnabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'"
              :title="tab.isEnabled ? 'Desactivar' : 'Activar'"
              @click="toggleTab(tab.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="tab.isEnabled" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
            <!-- Edit -->
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
              title="Editar"
              @click="openEditModal(tab)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <!-- Delete (only non-system keys) -->
            <button
              v-if="!SYSTEM_KEYS.includes(tab.key)"
              class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              title="Eliminar"
              @click="confirmDelete(tab)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <div class="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <p class="text-base font-bold text-gray-800 mb-1">Sin tabs configurados</p>
        <p class="text-sm text-gray-400 mb-6">Crea el primer tab de búsqueda</p>
        <button
          class="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
          @click="openCreateModal"
        >
          Crear Tab
        </button>
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
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 class="text-lg font-black text-gray-900">{{ editingTab ? 'Editar Tab' : 'Nuevo Tab' }}</h2>
              <button class="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors" @click="closeModal">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
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
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
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
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
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
                    class="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  />
                  <!-- Preview -->
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center"
                    :style="{ backgroundColor: form.color || '#EF4444' }"
                  >
                    <svg v-if="form.icon" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="form.icon" />
                    </svg>
                    <span v-else class="text-white font-black text-sm">{{ (form.label || 'T')[0] }}</span>
                  </div>
                </div>
              </div>

              <!-- Icon path (SVG d attribute) -->
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1.5">Icono SVG (atributo "d" del path)</label>
                <textarea
                  v-model="form.icon"
                  rows="2"
                  placeholder="M4 6a2 2 0 012-2h2..."
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-none"
                />
                <p class="text-xs text-gray-400 mt-1">Pega el valor del atributo <code>d</code> de un SVG 24x24 de Heroicons</p>
              </div>

              <!-- Enabled -->
              <div class="flex items-center justify-between">
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
                  class="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
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
          <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          {{ toast }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useSearchTabs } from '~/composables/useSearchTabs'
import type { SearchTab } from '~/composables/useSearchTabs'

definePageMeta({ layout: 'default' })

const SYSTEM_KEYS = ['productos', 'servicios', 'empleos']

const { adminLoadAll, adminCreate, adminUpdate, adminToggle, adminReorder, adminDelete } = useSearchTabs()
const { getHeaders } = useAuth()

const tabs = ref<SearchTab[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const toast = ref<string | null>(null)

const showModal = ref(false)
const editingTab = ref<SearchTab | null>(null)
const tabToDelete = ref<SearchTab | null>(null)

const form = reactive({
  key: '',
  label: '',
  icon: '',
  color: '#EF4444',
  isEnabled: true,
})

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => { toast.value = null }, 3000)
}

async function loadTabs() {
  loading.value = true
  error.value = null
  try {
    tabs.value = await adminLoadAll(getHeaders())
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

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
      }, getHeaders())
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
      }, getHeaders())
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

async function toggleTab(id: string) {
  try {
    const updated = await adminToggle(id, getHeaders())
    const idx = tabs.value.findIndex(t => t.id === id)
    if (idx !== -1) tabs.value[idx] = updated
    showToast(updated.isEnabled ? 'Tab activado' : 'Tab desactivado')
  } catch (e: any) {
    error.value = e.message
  }
}

async function moveTab(id: string, direction: 'up' | 'down') {
  const sorted = [...tabs.value].sort((a, b) => a.sortOrder - b.sortOrder)
  const idx = sorted.findIndex(t => t.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= sorted.length) return

  // Swap
  ;[sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]]
  const ids = sorted.map(t => t.id)
  try {
    const reordered = await adminReorder(ids, getHeaders())
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
    await adminDelete(tabToDelete.value.id, getHeaders())
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
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px); }
</style>
