<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 class="text-lg font-bold text-gray-900">Gestionar Categorías de Negocio</h2>
          <p class="text-xs text-gray-500 mt-0.5">Define qué módulos están disponibles por tipo de negocio</p>
        </div>
        <button @click="$emit('close')" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4">

        <!-- Add category -->
        <div class="flex gap-2">
          <input v-model="newName" placeholder="Nueva categoría..." class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" @keydown.enter="addCategory" />
          <input v-model="newIcon" placeholder="🏢" class="w-14 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button @click="addCategory" :disabled="!newName.trim() || saving" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            Agregar
          </button>
        </div>

        <p v-if="error" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

        <!-- Category list -->
        <div v-for="cat in localCategories" :key="cat.id" class="border border-gray-200 rounded-xl overflow-hidden">

          <!-- Category header -->
          <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span class="text-lg">{{ cat.icon || '🏢' }}</span>
            <div class="flex-1">
              <div v-if="editingId !== cat.id" class="flex items-center gap-2">
                <span class="font-medium text-gray-800 text-sm">{{ cat.name }}</span>
                <span class="text-xs text-gray-400">({{ cat._count?.users ?? 0 }} usuarios)</span>
              </div>
              <div v-else class="flex gap-2">
                <input v-model="editName" class="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input v-model="editIcon" class="w-12 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="🏢" />
              </div>
            </div>
            <div class="flex gap-1">
              <button v-if="editingId !== cat.id" @click="startEdit(cat)" class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors" title="Editar nombre">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button v-if="editingId === cat.id" @click="saveEdit(cat)" :disabled="saving" class="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition-colors" title="Guardar">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </button>
              <button v-if="editingId === cat.id" @click="editingId = null" class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors" title="Cancelar">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <button @click="deleteCategory(cat)" :disabled="(cat._count?.users ?? 0) > 0 || saving" class="p-1.5 rounded-lg hover:bg-red-100 text-red-500 disabled:opacity-30 transition-colors" title="Eliminar">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <!-- Modules grid -->
          <div class="p-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Módulos habilitados</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label
                v-for="mod in ALL_MODULES"
                :key="mod"
                class="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  :checked="cat.allowedModules.includes(mod)"
                  @change="toggleModule(cat, mod)"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span class="text-xs text-gray-700 group-hover:text-gray-900 capitalize">
                  {{ MODULE_LABELS[mod] ?? mod }}
                </span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="localCategories.length === 0" class="text-center py-8 text-gray-400 text-sm">
          No hay categorías. Agrega una arriba.
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end">
        <button @click="$emit('close')" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const ALL_MODULES = [
  'dashboard', 'menu', 'inventory', 'orders', 'customers', 'appointments',
  'delivery', 'expenses', 'analytics', 'reports', 'sales', 'employees',
  'branches', 'settings', 'notifications', 'services', 'service_requests', 'catalog',
]

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', menu: 'Menú / Productos', inventory: 'Inventario',
  orders: 'Pedidos', customers: 'Clientes', appointments: 'Agendamientos',
  delivery: 'Delivery', expenses: 'Gastos', analytics: 'Analytics',
  reports: 'Reportes', sales: 'Ventas', employees: 'Empleados',
  branches: 'Sucursales', settings: 'Configuración', notifications: 'Notificaciones',
  services: 'Servicios', service_requests: 'Solicitudes', catalog: 'Catálogo',
}

interface Cat { id: string; name: string; icon?: string; allowedModules: string[]; _count?: { users: number } }

const emit = defineEmits(['close', 'updated'])

const config = useRuntimeConfig()
const { getHeaders } = useAuth()

const localCategories = ref<Cat[]>([])
const newName = ref('')
const newIcon = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')
const editIcon = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.public.apiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getHeaders(), ...(options.headers as Record<string, string> ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Error ${res.status}`)
  }
  return res.json()
}

async function load() {
  localCategories.value = await apiFetch<Cat[]>('/users/categories')
}

async function addCategory() {
  if (!newName.value.trim()) return
  saving.value = true; error.value = null
  try {
    await apiFetch('/users/categories', {
      method: 'POST',
      body: JSON.stringify({ name: newName.value.trim(), icon: newIcon.value || undefined, allowedModules: [] }),
    })
    newName.value = ''; newIcon.value = ''
    await load(); emit('updated')
  } catch (e: any) { error.value = e.message }
  finally { saving.value = false }
}

function startEdit(cat: Cat) {
  editingId.value = cat.id; editName.value = cat.name; editIcon.value = cat.icon ?? ''
}

async function saveEdit(cat: Cat) {
  saving.value = true; error.value = null
  try {
    await apiFetch(`/users/categories/${cat.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editName.value, icon: editIcon.value || undefined }),
    })
    editingId.value = null; await load(); emit('updated')
  } catch (e: any) { error.value = e.message }
  finally { saving.value = false }
}

async function deleteCategory(cat: Cat) {
  if (!confirm(`¿Eliminar categoría "${cat.name}"?`)) return
  saving.value = true; error.value = null
  try {
    await apiFetch(`/users/categories/${cat.id}`, { method: 'DELETE' })
    await load(); emit('updated')
  } catch (e: any) { error.value = e.message }
  finally { saving.value = false }
}

async function toggleModule(cat: Cat, mod: string) {
  const current = cat.allowedModules ?? []
  const updated = current.includes(mod) ? current.filter(m => m !== mod) : [...current, mod]
  // Optimistic update
  cat.allowedModules = updated
  try {
    await apiFetch(`/users/categories/${cat.id}`, {
      method: 'PUT',
      body: JSON.stringify({ allowedModules: updated }),
    })
    emit('updated')
  } catch (e: any) {
    // Revert
    cat.allowedModules = current
    error.value = e.message
  }
}

onMounted(load)
</script>
