<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-full p-6">

      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Matriz de Permisos</h1>
          <p class="text-sm text-gray-500 mt-1">
            Configura qué acciones puede realizar cada rol. Los permisos con
            <span class="inline-flex items-center gap-1 font-medium text-red-600">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              candado
            </span>
            son del sistema y no pueden modificarse.
          </p>
        </div>
        <div class="flex gap-3 flex-shrink-0">
          <button
            @click="openNewPermModal"
            class="px-4 py-2 text-sm font-medium border border-indigo-300 rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 transition-colors flex items-center gap-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nuevo permiso
          </button>
          <button
            @click="loadMatrix"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg class="w-4 h-4 inline mr-1.5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Recargar
          </button>
          <button
            @click="saveAll"
            :disabled="saving || pendingChanges.length === 0"
            class="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg v-if="saving" class="w-4 h-4 inline mr-1.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {{ saving ? 'Guardando...' : `Guardar cambios${pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ''}` }}
          </button>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <div v-if="successMsg" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-start gap-3">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>{{ successMsg }}</span>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading && permissions.length === 0" class="space-y-2">
        <div v-for="i in 12" :key="i" class="h-10 bg-gray-200 rounded-lg animate-pulse"/>
      </div>

      <!-- Permission Matrix Table -->
      <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-gray-700 min-w-[240px]">Permiso</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-700 w-28">Módulo</th>
                <th
                  v-for="r in ROLES"
                  :key="r"
                  class="text-center px-4 py-3 font-semibold text-gray-700 w-28"
                >
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="ROLE_BADGE_CLASSES[r]"
                  >
                    {{ ROLE_LABELS[r] }}
                  </span>
                </th>
                <th class="w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <template v-for="(group, module) in groupedPermissions" :key="module">
                <!-- Module header row -->
                <tr class="bg-gradient-to-r from-gray-50 to-gray-50/50">
                  <td :colspan="2 + ROLES.length" class="px-4 py-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="w-2 h-2 rounded-full bg-red-500 shrink-0"/>
                      <span class="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        {{ MODULE_LABELS[module] ?? module }}
                      </span>
                      <span class="text-xs text-gray-400">({{ group.length }})</span>
                      <!-- Plan badges -->
                      <div v-if="plansForModule[module]?.length" class="flex items-center gap-1 ml-2">
                        <span class="text-xs text-gray-400 mr-0.5">Planes:</span>
                        <span
                          v-for="plan in plansForModule[module]"
                          :key="plan.id"
                          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white leading-none"
                          :style="{ backgroundColor: plan.color }"
                          :title="`Módulo incluido en plan ${plan.name}`"
                        >{{ plan.name }}</span>
                      </div>
                      <span v-else class="text-[10px] text-gray-300 ml-2 italic">Sin plan</span>
                    </div>
                  </td>
                </tr>
                <!-- Permission rows -->
                <tr
                  v-for="perm in group"
                  :key="perm.id"
                  class="hover:bg-gray-50/80 transition-colors"
                  :class="{ 'opacity-60': perm.isSystem }"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-start gap-2">
                      <svg
                        v-if="perm.isSystem"
                        class="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                      <div>
                        <div class="font-medium text-gray-800">{{ perm.label }}</div>
                        <div class="text-xs text-gray-400 font-mono mt-0.5">{{ perm.key }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-500 capitalize text-xs">{{ perm.module }}</td>
                  <td
                    v-for="r in ROLES"
                    :key="r"
                    class="text-center px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      :checked="localMatrix[perm.id]?.[r] ?? false"
                      :disabled="perm.isSystem || r === 'SUPERADMIN'"
                      @change="toggleLocal(perm.id, r, ($event.target as HTMLInputElement).checked)"
                      class="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 focus:ring-2
                             disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                      :title="perm.isSystem ? 'Permiso de sistema — no editable' : r === 'SUPERADMIN' ? 'SUPERADMIN siempre tiene todos los permisos' : ''"
                    />
                  </td>
                  <!-- Delete action -->
                  <td class="px-3 py-3 text-center">
                    <button
                      v-if="!perm.isSystem"
                      @click="confirmDelete(perm)"
                      class="text-gray-300 hover:text-red-500 transition-colors"
                      title="Eliminar permiso"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && permissions.length === 0" class="text-center py-16 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <p class="font-medium">No hay permisos cargados</p>
          <p class="text-sm mt-1">Ejecuta el seeder del backend para inicializar la matriz</p>
        </div>
      </div>

      <!-- Footer info -->
      <div class="mt-4 text-xs text-gray-400 flex items-center gap-4">
        <span>{{ permissions.length }} permisos totales</span>
        <span v-if="pendingChanges.length > 0" class="text-amber-600 font-medium">
          {{ pendingChanges.length }} cambio(s) sin guardar
        </span>
      </div>

    </div>

    <!-- New permission modal -->
    <Teleport to="body">
      <div v-if="showNewPermModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900">Nuevo permiso</h3>
            <button @click="showNewPermModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form @submit.prevent="saveNewPerm" class="px-6 py-5 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Módulo <span class="text-red-500">*</span></label>
                <select v-model="newPermForm.module" @change="autoFillKey" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Seleccionar...</option>
                  <option v-for="mod in ALL_PERM_MODULES" :key="mod" :value="mod">{{ MODULE_LABELS[mod] ?? mod }}</option>
                  <option value="__custom">Otro (personalizado)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Acción <span class="text-red-500">*</span></label>
                <input v-model="newPermForm.action" @input="autoFillKey" required placeholder="view, create, export…" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
            <div v-if="newPermForm.module === '__custom'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Módulo personalizado</label>
              <input v-model="newPermForm.customModule" @input="autoFillKey" placeholder="mi_modulo" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Clave (key) <span class="text-red-500">*</span></label>
              <input v-model="newPermForm.key" required placeholder="módulo:acción" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <p class="text-xs text-gray-400 mt-1">Se usa en código: <code>can('{{ newPermForm.key || 'modulo:accion' }}')</code></p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Etiqueta <span class="text-red-500">*</span></label>
              <input v-model="newPermForm.label" required placeholder="Ver reportes exportados" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
              <input v-model="newPermForm.description" placeholder="Descripción breve del permiso" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div v-if="newPermError" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{{ newPermError }}</div>
            <div class="flex justify-end gap-3 pt-1">
              <button type="button" @click="showNewPermModal = false" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" :disabled="savingPerm" class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium">
                {{ savingPerm ? 'Creando...' : 'Crear permiso' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })

type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

const ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER', 'NORMAL']

const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  COMMERCE: 'Comercio',
  FREELANCER: 'Freelancer',
  NORMAL: 'Normal',
}

const ROLE_BADGE_CLASSES: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  COMMERCE: 'bg-green-100 text-green-800',
  FREELANCER: 'bg-yellow-100 text-yellow-800',
  NORMAL: 'bg-gray-100 text-gray-700',
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  menu: 'Menú',
  inventory: 'Inventario',
  orders: 'Pedidos',
  customers: 'Clientes',
  appointments: 'Agendamientos',
  delivery: 'Delivery',
  expenses: 'Gastos',
  analytics: 'Analytics',
  reports: 'Reportes',
  sales: 'Ventas',
  employees: 'Empleados',
  branches: 'Sucursales',
  settings: 'Configuración',
  notifications: 'Notificaciones',
  catalog: 'Catálogo',
  users: 'Usuarios',
  permissions: 'Permisos',
  audit: 'Auditoría',
  logs: 'Logs',
  plans: 'Planes',
  exchange_rates: 'Tasas de Cambio',
  search: 'Búsqueda',
  corridas: 'Corridas',
}

// All modules available for permission grouping
const ALL_PERM_MODULES = Object.keys(MODULE_LABELS)

interface PermissionRow {
  id: string
  key: string
  module: string
  action: string
  label: string
  description?: string
  isSystem: boolean
  roles: Partial<Record<Role, boolean>>
}

interface PendingChange {
  role: Role
  permissionId: string
  granted: boolean
}

const { getHeaders, refreshAccessToken } = useAuth()
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

interface PlanInfo { id: string; name: string; color: string; enabledModules: string[] }

const permissions = ref<PermissionRow[]>([])
const localMatrix = ref<Record<string, Record<Role, boolean>>>({})
const pendingChanges = ref<PendingChange[]>([])
const plans = ref<PlanInfo[]>([])

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const successMsg = ref<string | null>(null)

// Plans that include a given module
const plansForModule = computed(() => {
  const map: Record<string, PlanInfo[]> = {}
  for (const plan of plans.value) {
    for (const mod of plan.enabledModules) {
      if (!map[mod]) map[mod] = []
      map[mod].push(plan)
    }
  }
  return map
})

const groupedPermissions = computed(() => {
  const groups: Record<string, PermissionRow[]> = {}
  for (const p of permissions.value) {
    if (!groups[p.module]) groups[p.module] = []
    groups[p.module].push(p)
  }
  return groups
})

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
    if (!ok) throw new Error('Sesión expirada, por favor inicia sesión nuevamente')
    res = await doFetch()
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `Error del servidor (${res.status})`)
  }
  return res.json() as Promise<T>
}

async function loadMatrix() {
  loading.value = true
  error.value = null
  try {
    const data = await apiFetch<PermissionRow[]>('/permissions/matrix')
    permissions.value = data

    const matrix: Record<string, Record<Role, boolean>> = {}
    for (const p of data) {
      matrix[p.id] = {} as Record<Role, boolean>
      for (const r of ROLES) {
        matrix[p.id][r] = p.roles[r] ?? false
      }
    }
    localMatrix.value = matrix
    pendingChanges.value = []
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function toggleLocal(permissionId: string, role: Role, granted: boolean) {
  if (!localMatrix.value[permissionId]) return
  localMatrix.value[permissionId][role] = granted

  const existing = pendingChanges.value.findIndex(
    c => c.permissionId === permissionId && c.role === role
  )
  if (existing >= 0) {
    pendingChanges.value[existing].granted = granted
  } else {
    pendingChanges.value.push({ role, permissionId, granted })
  }
}

async function saveAll() {
  if (pendingChanges.value.length === 0) return
  saving.value = true
  error.value = null
  successMsg.value = null
  try {
    const count = pendingChanges.value.length
    await apiFetch('/permissions/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ updates: pendingChanges.value }),
    })
    pendingChanges.value = []
    successMsg.value = `${count} permiso(s) actualizados correctamente. Los cambios se aplican en los próximos 5 minutos (cache Redis).`
    setTimeout(() => { successMsg.value = null }, 6000)
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

async function loadPlans() {
  try {
    const data = await apiFetch<PlanInfo[]>('/plans?includeInactive=false')
    plans.value = data
  } catch { /* non-critical */ }
}

// ── New permission modal ───────────────────────────────────────────────────

const showNewPermModal = ref(false)
const savingPerm = ref(false)
const newPermError = ref<string | null>(null)

const defaultNewPermForm = () => ({
  module: '',
  customModule: '',
  action: '',
  key: '',
  label: '',
  description: '',
})

const newPermForm = ref(defaultNewPermForm())

function openNewPermModal() {
  newPermForm.value = defaultNewPermForm()
  newPermError.value = null
  showNewPermModal.value = true
}

function autoFillKey() {
  const mod = newPermForm.value.module === '__custom'
    ? newPermForm.value.customModule.trim()
    : newPermForm.value.module
  const action = newPermForm.value.action.trim()
  if (mod && action) newPermForm.value.key = `${mod}:${action}`
}

async function saveNewPerm() {
  savingPerm.value = true
  newPermError.value = null
  try {
    const module = newPermForm.value.module === '__custom'
      ? newPermForm.value.customModule.trim()
      : newPermForm.value.module

    await apiFetch('/permissions', {
      method: 'POST',
      body: JSON.stringify({
        key: newPermForm.value.key.trim(),
        module,
        action: newPermForm.value.action.trim(),
        label: newPermForm.value.label.trim(),
        description: newPermForm.value.description.trim() || undefined,
      }),
    })
    showNewPermModal.value = false
    await loadMatrix()
    successMsg.value = `Permiso "${newPermForm.value.key}" creado correctamente.`
    setTimeout(() => { successMsg.value = null }, 4000)
  } catch (e: any) {
    newPermError.value = e.message
  } finally {
    savingPerm.value = false
  }
}

async function confirmDelete(perm: PermissionRow) {
  if (!confirm(`¿Eliminar el permiso "${perm.label}" (${perm.key})?\nEsta acción no se puede deshacer.`)) return
  try {
    await apiFetch(`/permissions/${perm.id}`, { method: 'DELETE' })
    await loadMatrix()
    successMsg.value = `Permiso "${perm.key}" eliminado.`
    setTimeout(() => { successMsg.value = null }, 3000)
  } catch (e: any) {
    error.value = e.message
  }
}

onMounted(() => { loadMatrix(); loadPlans() })
</script>
