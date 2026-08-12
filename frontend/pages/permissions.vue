<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-full p-6">

      <!-- Header -->
      <PageHeader
        title="Matriz de Permisos"
        description="Configura qué acciones puede realizar cada rol. Los permisos con candado son del sistema y no pueden modificarse."
        :icon="ShieldCheckIcon"
        :breadcrumb="[{ label: 'Permisos' }]"
        :stats="headerStats"
      >
        <template #actions>
          <HeaderActionButton to="/permissions/users" :icon="UserGroupIcon">
            Permisos por Usuario
          </HeaderActionButton>
          <HeaderActionButton :icon="PlusIcon" @click="openNewPermModal">
            Nuevo permiso
          </HeaderActionButton>
          <HeaderActionButton
            :icon="ArrowPathIcon"
            :loading="reloadingPerms"
            :disabled="reloadingPerms"
            title="Fuerza recarga de permisos para todos los usuarios (incluyéndote)"
            @click="reloadUserPermissions"
          >
            {{ reloadingPerms ? 'Recargando...' : 'Recargar mis permisos' }}
          </HeaderActionButton>
          <HeaderActionButton
            variant="primary"
            :icon="saving ? ArrowPathIcon : undefined"
            :loading="saving"
            :disabled="saving || pendingChanges.length === 0"
            @click="saveAll"
          >
            {{ saving ? 'Guardando...' : `Guardar cambios${pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ''}` }}
          </HeaderActionButton>
        </template>
      </PageHeader>

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

      <!-- Módulos del sistema (kill-switch global) -->
      <div class="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 class="font-semibold text-gray-800 text-sm">Módulos del sistema</h2>
          <p class="text-xs text-gray-500 mt-0.5">
            Apagar un módulo aquí lo oculta del sidebar de <strong>todos</strong> los usuarios, incluido SUPERADMIN.
            Úsalo para mantenimiento o lanzamientos por etapas — no reemplaza la matriz de permisos.
          </p>
        </div>
        <div v-if="loadingModules" class="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <div v-for="i in 8" :key="i" class="h-9 bg-gray-100 rounded-lg animate-pulse"/>
        </div>
        <div v-else class="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <label
            v-for="m in systemModules"
            :key="m.module"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
            :class="m.enabled ? 'border-gray-200 hover:border-gray-300' : 'border-red-200 bg-red-50/50'"
          >
            <input
              type="checkbox"
              :checked="m.enabled"
              :disabled="togglingModule === m.module"
              @change="toggleSystemModule(m, ($event.target as HTMLInputElement).checked)"
              class="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 focus:ring-2 disabled:opacity-40"
            />
            <span class="text-sm" :class="m.enabled ? 'text-gray-700' : 'text-red-600 font-medium'">
              {{ MODULE_LABELS[m.module] ?? m.module }}
            </span>
          </label>
        </div>
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Conceder inicialmente a</label>
              <div class="flex flex-wrap gap-3">
                <label v-for="r in ROLES" :key="r" class="inline-flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    :value="r"
                    v-model="newPermForm.grantedRoles"
                    :disabled="r === 'SUPERADMIN'"
                    class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-400 disabled:opacity-40"
                  />
                  {{ ROLE_LABELS[r] }}
                </label>
              </div>
              <p class="text-xs text-gray-400 mt-1">SUPERADMIN siempre tiene acceso, sin importar esta selección.</p>
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
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import { ShieldCheckIcon, PlusIcon, TrashIcon, UserGroupIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { useAlert } from '~/composables/useAlert'
import { useModuleCatalog } from '~/composables/useModuleCatalog'

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

const { labels: MODULE_LABELS, catalog: moduleCatalog, load: loadModuleCatalog } = useModuleCatalog()

// All modules available for permission grouping
const ALL_PERM_MODULES = computed(() => moduleCatalog.value.map((m) => m.key))

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
const { reloadPermissions } = usePermissions()
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

interface PlanInfo { id: string; name: string; color: string; enabledModules: string[] }
interface SystemModuleRow { module: string; enabled: boolean; label: string | null }

const permissions = ref<PermissionRow[]>([])
const localMatrix = ref<Record<string, Record<Role, boolean>>>({})
const pendingChanges = ref<PendingChange[]>([])
const plans = ref<PlanInfo[]>([])
const systemModules = ref<SystemModuleRow[]>([])
const loadingModules = ref(false)
const togglingModule = ref<string | null>(null)

const loading = ref(false)
const saving = ref(false)
const reloadingPerms = ref(false)
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

const headerStats = computed(() => [
  { label: 'Permisos', value: permissions.value.length },
  { label: 'Módulos', value: Object.keys(groupedPermissions.value).length },
  { label: 'Del sistema', value: permissions.value.filter((p: PermissionRow) => p.isSystem).length },
  { label: 'Sin guardar', value: pendingChanges.value.length },
])

const { get, post, patch, del } = useApi()
const alert = useAlert()

async function loadMatrix() {
  loading.value = true
  error.value = null
  try {
    const data = await get('/permissions/matrix')
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
    await patch('/permissions/bulk', { updates: pendingChanges.value })
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
    const data = await get('/plans?includeInactive=false')
    plans.value = data
  } catch { /* non-critical */ }
}

async function loadSystemModules() {
  loadingModules.value = true
  try {
    systemModules.value = await get('/system-modules')
  } catch { /* non-critical */ } finally {
    loadingModules.value = false
  }
}

async function toggleSystemModule(m: SystemModuleRow, enabled: boolean) {
  togglingModule.value = m.module
  const previous = m.enabled
  m.enabled = enabled // optimistic
  try {
    await patch('/system-modules/toggle', { module: m.module, enabled })
    successMsg.value = `Módulo "${MODULE_LABELS[m.module] ?? m.module}" ${enabled ? 'activado' : 'desactivado'} para toda la plataforma.`
    setTimeout(() => { successMsg.value = null }, 4000)
  } catch (e: any) {
    m.enabled = previous // rollback
    error.value = e.message || 'No se pudo actualizar el módulo'
  } finally {
    togglingModule.value = null
  }
}

async function reloadUserPermissions() {
  reloadingPerms.value = true
  error.value = null
  try {
    await reloadPermissions()
    successMsg.value = 'Tus permisos han sido recargados. Los cambios están activos inmediatamente.'
    setTimeout(() => { successMsg.value = null }, 4000)
  } catch (e: any) {
    error.value = e.message || 'Error recargando permisos'
  } finally {
    reloadingPerms.value = false
  }
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
  grantedRoles: [] as Role[],
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

    await post('/permissions', {
      key: newPermForm.value.key.trim(),
      label: newPermForm.value.label.trim(),
      description: newPermForm.value.description?.trim() || null,
      module: module,
      action: newPermForm.value.action.trim(),
      grantedRoles: newPermForm.value.grantedRoles,
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
  const result = await alert.confirm(
    'Eliminar permiso',
    `¿Eliminar el permiso "${perm.label}" (${perm.key})? Esta acción no se puede deshacer.`,
    'Eliminar', 'Cancelar',
  )
  if (!result.isConfirmed) return
  try {
    await del(`/permissions/${perm.id}`)
    await loadMatrix()
    successMsg.value = `Permiso "${perm.key}" eliminado.`
    setTimeout(() => { successMsg.value = null }, 3000)
  } catch (e: any) {
    error.value = e.message
  }
}

onMounted(() => { loadMatrix(); loadPlans(); loadSystemModules(); loadModuleCatalog() })
</script>
