<template>
  <div class="min-h-screen bg-slate-50/80">
    <div class="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
      <PermissionsWorkspaceHeader
        title="Administración de permisos"
        description="Configura el acceso de la plataforma por responsabilidades. Mantén separados los roles base, los perfiles de negocio y la disponibilidad global de módulos."
        :icon="ShieldCheckIcon"
        :breadcrumb="[{ label: 'Administración' }, { label: 'Permisos' }]"
        :stats="headerStats"
      >
        <template #actions>
          <HeaderActionButton to="/permissions/users" :icon="UserGroupIcon">
            Excepciones por usuario
          </HeaderActionButton>
          <HeaderActionButton v-if="activeTab === 'roles'" :icon="PlusIcon" @click="openNewPermModal">
            Nuevo permiso
          </HeaderActionButton>
          <HeaderActionButton
            v-if="activeTab === 'roles'"
            :icon="ArrowPathIcon"
            :loading="reloadingPerms"
            :disabled="reloadingPerms"
            title="Recarga únicamente los permisos de tu sesión"
            @click="reloadUserPermissions"
          >
            {{ reloadingPerms ? 'Recargando...' : 'Recargar mi sesión' }}
          </HeaderActionButton>
        </template>
      </PermissionsWorkspaceHeader>

      <nav class="mb-5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm" aria-label="Ámbitos de permisos">
        <div class="grid grid-cols-1 gap-1 sm:grid-cols-3">
          <button
            v-for="tab in permissionTabs"
            :key="tab.id"
            type="button"
            class="group flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-workplace-red focus-visible:ring-offset-2"
            :class="activeTab === tab.id ? 'bg-red-50 text-workplace-red ring-1 ring-inset ring-red-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
            :aria-pressed="activeTab === tab.id"
            @click="selectTab(tab.id)"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors" :class="activeTab === tab.id ? 'bg-white text-workplace-red shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-white'">
              <ShieldCheckIcon v-if="tab.id === 'roles'" class="h-5 w-5" />
              <UserGroupIcon v-else-if="tab.id === 'profiles'" class="h-5 w-5" />
              <Squares2X2Icon v-else class="h-5 w-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2 text-sm font-semibold">{{ tab.label }}</span>
              <span class="mt-0.5 block text-xs font-normal" :class="activeTab === tab.id ? 'text-red-700/70' : 'text-gray-400'">{{ tab.description }}</span>
            </span>
            <span v-if="tab.id === 'roles' && pendingChanges.length" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{{ pendingChanges.length }}</span>
            <span v-if="tab.id === 'profiles' && pendingProfileChanges.length" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{{ pendingProfileChanges.length }}</span>
            <span v-if="activeTab === tab.id" class="h-2 w-2 shrink-0 rounded-full bg-workplace-red" />
          </button>
        </div>
      </nav>

      <div v-if="error" role="alert" class="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="min-w-0 flex-1">{{ error }}</span>
        <button type="button" class="text-xs font-semibold underline underline-offset-2" @click="error = null">Cerrar</button>
      </div>

      <div v-if="successMsg" role="status" aria-live="polite" class="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>{{ successMsg }}</span>
        <button type="button" class="ml-auto text-xs font-semibold underline underline-offset-2" @click="successMsg = null">Cerrar</button>
      </div>

      <RolePermissionsPanel
        v-if="activeTab === 'roles'"
        :loading="loading"
        :permissions="permissions"
        :grouped-permissions="groupedPermissions"
        :roles="ROLES"
        :role-labels="ROLE_LABELS"
        :role-badge-classes="ROLE_BADGE_CLASSES"
        :module-labels="MODULE_LABELS"
        :plans-for-module="plansForModule"
        :local-matrix="localMatrix"
        :disabled-columns="lockedRoleColumns"
        :pending-count="pendingChanges.length"
        @toggle="toggleLocal"
        @delete="confirmDelete"
      >
        <template #actions>
          <HeaderActionButton
            variant="primary"
            :icon="saving ? ArrowPathIcon : undefined"
            :loading="saving"
            :disabled="saving || pendingChanges.length === 0"
            @click="saveAll"
          >
            {{ saving ? 'Guardando...' : `Guardar cambios${pendingChanges.length ? ` (${pendingChanges.length})` : ''}` }}
          </HeaderActionButton>
        </template>
      </RolePermissionsPanel>

      <ProfilePermissionsPanel
        v-else-if="activeTab === 'profiles'"
        :loading="loadingProfileMatrix"
        :permissions="profilePermissions"
        :grouped-permissions="groupedProfilePermissions"
        :profile-keys="PROFILE_KEYS"
        :profile-labels="PROFILE_LABELS"
        :profile-badge-classes="PROFILE_BADGE_CLASSES"
        :module-labels="MODULE_LABELS"
        :local-matrix="localProfileMatrix"
        :pending-count="pendingProfileChanges.length"
        @toggle="toggleProfileLocal"
      >
        <template #actions>
          <HeaderActionButton
            variant="primary"
            :icon="savingProfile ? ArrowPathIcon : undefined"
            :loading="savingProfile"
            :disabled="savingProfile || pendingProfileChanges.length === 0"
            @click="saveAllProfile"
          >
            {{ savingProfile ? 'Guardando...' : `Guardar cambios${pendingProfileChanges.length ? ` (${pendingProfileChanges.length})` : ''}` }}
          </HeaderActionButton>
        </template>
      </ProfilePermissionsPanel>

      <section v-else class="space-y-4" aria-labelledby="system-modules-heading">
        <div class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
            <Squares2X2Icon class="h-5 w-5" />
          </div>
          <div>
            <h2 id="system-modules-heading" class="text-sm font-semibold text-blue-950">Disponibilidad global de módulos</h2>
            <p class="mt-1 text-xs leading-5 text-blue-800/80">Controla qué módulos están disponibles en toda la plataforma. Activar un módulo no concede permisos RBAC ni capacidades de perfil.</p>
          </div>
        </div>
        <SystemModulesPanel
          :loading="loadingModules"
          :modules="systemModules"
          :toggling-module="togglingModule"
          :module-labels="MODULE_LABELS"
          @toggle="toggleSystemModule"
        />
      </section>
    </div>

    <NewPermissionModal
      :show="showNewPermModal"
      :saving="savingPerm"
      :error="newPermError"
      :form="newPermForm"
      :all-modules="ALL_PERM_MODULES"
      :module-labels="MODULE_LABELS"
      :roles="ROLES"
      :role-labels="ROLE_LABELS"
      :disabled-roles="lockedRoleColumns"
      @close="showNewPermModal = false"
      @submit="saveNewPerm"
      @module-change="autoFillKey"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import PermissionsWorkspaceHeader from '~/components/admin/permissions/PermissionsWorkspaceHeader.vue'
import RolePermissionsPanel from '~/components/admin/permissions/RolePermissionsPanel.vue'
import ProfilePermissionsPanel from '~/components/admin/permissions/ProfilePermissionsPanel.vue'
import SystemModulesPanel from '~/components/admin/permissions/SystemModulesPanel.vue'
import { ShieldCheckIcon, PlusIcon, UserGroupIcon, ArrowPathIcon, Squares2X2Icon } from '@heroicons/vue/24/outline'
import NewPermissionModal, { type NewPermissionForm } from '~/components/admin/permissions/NewPermissionModal.vue'
import { useApi } from '~/composables/core/useApi'
import { useAuth } from '~/composables/auth/useAuth'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useModuleCatalog } from '~/composables/commerce/useModuleCatalog'
import { getPermissionMatrixChanges } from '~/utils/permissionMatrixDraft'

definePageMeta({ middleware: 'auth' })

type Role = 'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL'

const ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'PROFESIONAL', 'NORMAL']

type PermissionTab = 'roles' | 'profiles' | 'modules'
const activeTab = ref<PermissionTab>('roles')
const permissionTabs: Array<{ id: PermissionTab; label: string; description: string }> = [
  { id: 'roles', label: 'Roles de acceso', description: 'Permisos base por rol' },
  { id: 'profiles', label: 'Perfiles de negocio', description: 'Capacidades por tipo de perfil' },
  { id: 'modules', label: 'Módulos de plataforma', description: 'Disponibilidad global' },
]

const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  PROFESIONAL: 'Profesional',
  NORMAL: 'Normal',
}

const ROLE_BADGE_CLASSES: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  PROFESIONAL: 'bg-green-100 text-green-800',
  NORMAL: 'bg-gray-100 text-gray-700',
}

// ── Matriz por Perfil (UserProfile) ────────────────────────────────────────
// Claves compuestas iguales a profileMatrixKey() en el backend
// (permissions.service.ts) — profileType solo, o `${profileType}_${subtype}`.
const PROFILE_KEYS = ['BUSINESS', 'PROFESSIONAL_FREELANCER', 'PROFESSIONAL_SERVICE_PROVIDER']

const PROFILE_LABELS: Record<string, string> = {
  BUSINESS: 'Negocio',
  PROFESSIONAL_FREELANCER: 'Profesional · Freelancer',
  PROFESSIONAL_SERVICE_PROVIDER: 'Profesional · Prestador de servicio',
}

const PROFILE_BADGE_CLASSES: Record<string, string> = {
  BUSINESS: 'bg-green-100 text-green-800',
  PROFESSIONAL_FREELANCER: 'bg-yellow-100 text-yellow-800',
  PROFESSIONAL_SERVICE_PROVIDER: 'bg-amber-100 text-amber-800',
}

// Mapa explícito en vez de parsear el string compuesto — solo hay 3 claves
// válidas (PROFILE_KEYS), igual que PermissionsService.PROFILE_MATRIX_KEYS
// en el backend.
const PROFILE_KEY_TO_PARTS: Record<string, { profileType: string; subtype?: string }> = {
  BUSINESS: { profileType: 'BUSINESS' },
  PROFESSIONAL_FREELANCER: { profileType: 'PROFESSIONAL', subtype: 'FREELANCER' },
  PROFESSIONAL_SERVICE_PROVIDER: { profileType: 'PROFESSIONAL', subtype: 'SERVICE_PROVIDER' },
}

const { labels: MODULE_LABELS, catalog: moduleCatalog, load: loadModuleCatalog } = useModuleCatalog()

// All modules available for permission grouping
const ALL_PERM_MODULES = computed(() => moduleCatalog.value.map((m) => m.module))

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

interface ProfilePermissionRow {
  id: string
  key: string
  module: string
  action: string
  label: string
  description?: string
  isSystem: boolean
  profiles: Partial<Record<string, boolean>>
}

interface PendingProfileChange {
  profileType: string
  subtype?: string
  permissionId: string
  granted: boolean
}

const { user } = useAuth()
const { reloadPermissions } = usePermissions()

// ADMIN no puede modificar su propia columna ni roles superiores.
const lockedRoleColumns = computed<Role[]>(() =>
  user.value?.role === 'ADMIN' ? ['SUPERADMIN', 'ADMIN'] : ['SUPERADMIN']
)

interface PlanInfo { id: string; name: string; color: string; enabledModules: string[] }
interface SystemModuleRow { module: string; enabled: boolean; label: string | null }

const permissions = ref<PermissionRow[]>([])
const localMatrix = ref<Record<string, Record<Role, boolean>>>({})
const originalMatrix = ref<Record<string, Record<Role, boolean>>>({})
const pendingChanges = computed<PendingChange[]>(() =>
  getPermissionMatrixChanges(originalMatrix.value, localMatrix.value, ROLES).map(change => ({
    role: change.key as Role,
    permissionId: change.permissionId,
    granted: change.granted,
  }))
)
const plans = ref<PlanInfo[]>([])
const systemModules = ref<SystemModuleRow[]>([])
const loadingModules = ref(false)
const togglingModule = ref<string | null>(null)

const loading = ref(false)
const saving = ref(false)
const reloadingPerms = ref(false)
const error = ref<string | null>(null)
const successMsg = ref<string | null>(null)

const profilePermissions = ref<ProfilePermissionRow[]>([])
const localProfileMatrix = ref<Record<string, Record<string, boolean>>>({})
const originalProfileMatrix = ref<Record<string, Record<string, boolean>>>({})
const pendingProfileChanges = computed<PendingProfileChange[]>(() =>
  getPermissionMatrixChanges(originalProfileMatrix.value, localProfileMatrix.value, PROFILE_KEYS).map(change => {
    const parts = PROFILE_KEY_TO_PARTS[change.key]
    return { ...parts, permissionId: change.permissionId, granted: change.granted }
  })
)
const loadingProfileMatrix = ref(false)
const savingProfile = ref(false)

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

const groupedProfilePermissions = computed(() => {
  const groups: Record<string, ProfilePermissionRow[]> = {}
  for (const p of profilePermissions.value) {
    if (!groups[p.module]) groups[p.module] = []
    groups[p.module].push(p)
  }
  return groups
})

const headerStats = computed(() => [
  { label: 'Permisos', value: permissions.value.length },
  { label: 'Módulos', value: Object.keys(groupedPermissions.value).length },
  { label: 'Del sistema', value: permissions.value.filter((p: PermissionRow) => p.isSystem).length },
  { label: 'Sin guardar', value: pendingChanges.value.length + pendingProfileChanges.value.length },
])

const { get, post, patch, del } = useApi()
const { confirm } = useConfirm()

async function selectTab(tab: PermissionTab) {
  if (tab === activeTab.value) return

  const hasUnsavedChanges = activeTab.value === 'roles'
    ? pendingChanges.value.length > 0
    : activeTab.value === 'profiles' && pendingProfileChanges.value.length > 0

  if (hasUnsavedChanges) {
    const discard = await confirm({
      title: 'Descartar cambios sin guardar',
      message: 'Hay cambios pendientes en esta sección. Si continúas, se descartarán y se cargarán los datos del servidor.',
      confirmText: 'Descartar y continuar',
      variant: 'danger',
    })
    if (!discard) return
  }

  activeTab.value = tab
}

async function loadMatrix() {
  loading.value = true
  error.value = null
  try {
    const data = await get<PermissionRow[]>('/permissions/matrix')
    permissions.value = data

    const matrix: Record<string, Record<Role, boolean>> = {}
    for (const p of data) {
      matrix[p.id] = {} as Record<Role, boolean>
      for (const r of ROLES) {
        matrix[p.id][r] = p.roles[r] ?? false
      }
    }
    localMatrix.value = matrix
    originalMatrix.value = Object.fromEntries(
      Object.entries(matrix).map(([id, values]) => [id, { ...values }])
    )
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

// PermissionMatrixTable emite el rol como string (sirve también para la
// matriz por perfil); en esta matriz siempre es uno de ROLES.
function toggleLocal(permissionId: string, roleKey: string, granted: boolean) {
  const role = roleKey as Role
  if (!localMatrix.value[permissionId]) return
  localMatrix.value[permissionId][role] = granted
}

async function saveAll() {
  if (pendingChanges.value.length === 0) return
  saving.value = true
  error.value = null
  successMsg.value = null
  try {
    const updates = [...pendingChanges.value]
    const count = updates.length
    await patch('/permissions/bulk', { updates })
    originalMatrix.value = Object.fromEntries(
      Object.entries(localMatrix.value).map(([id, values]) => [id, { ...values }])
    )
    successMsg.value = `${count} permiso(s) actualizados correctamente. Los cambios se aplican en los próximos 5 minutos (cache Redis).`
    setTimeout(() => { successMsg.value = null }, 6000)
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

async function loadProfileMatrix() {
  loadingProfileMatrix.value = true
  try {
    const data = await get<ProfilePermissionRow[]>('/permissions/profile-matrix')
    profilePermissions.value = data

    const matrix: Record<string, Record<string, boolean>> = {}
    for (const p of data) {
      matrix[p.id] = {}
      for (const key of PROFILE_KEYS) {
        matrix[p.id][key] = p.profiles[key] ?? false
      }
    }
    localProfileMatrix.value = matrix
    originalProfileMatrix.value = Object.fromEntries(
      Object.entries(matrix).map(([id, values]) => [id, { ...values }])
    )
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    loadingProfileMatrix.value = false
  }
}

function toggleProfileLocal(permissionId: string, profileKey: string, granted: boolean) {
  if (!localProfileMatrix.value[permissionId]) return
  localProfileMatrix.value[permissionId][profileKey] = granted

}

async function saveAllProfile() {
  if (pendingProfileChanges.value.length === 0) return
  savingProfile.value = true
  error.value = null
  successMsg.value = null
  try {
    const updates = [...pendingProfileChanges.value]
    const count = updates.length
    await patch('/permissions/profile-bulk', { updates })
    originalProfileMatrix.value = Object.fromEntries(
      Object.entries(localProfileMatrix.value).map(([id, values]) => [id, { ...values }])
    )
    successMsg.value = `${count} permiso(s) de perfil actualizados correctamente. Los cambios se aplican en los próximos 5 minutos (cache Redis).`
    setTimeout(() => { successMsg.value = null }, 6000)
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    savingProfile.value = false
  }
}

async function loadPlans() {
  try {
    const data = await get<PlanInfo[]>('/plans?includeInactive=false')
    plans.value = data
  } catch { /* non-critical */ }
}

async function loadSystemModules() {
  loadingModules.value = true
  try {
    systemModules.value = await get<SystemModuleRow[]>('/system-modules')
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
    successMsg.value = `Módulo "${MODULE_LABELS.value[m.module] ?? m.module}" ${enabled ? 'activado' : 'desactivado'} para toda la plataforma.`
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

const defaultNewPermForm = (): NewPermissionForm => ({
  module: '',
  customModule: '',
  action: '',
  key: '',
  label: '',
  description: '',
  grantedRoles: [],
})

const newPermForm = ref<NewPermissionForm>(defaultNewPermForm())

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

async function confirmDelete(perm: Pick<PermissionRow, 'id' | 'key' | 'label'>) {
  const ok = await confirm({
    title: 'Eliminar permiso',
    message: `¿Eliminar el permiso "${perm.label}" (${perm.key})? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  try {
    await del(`/permissions/${perm.id}`)
    await loadMatrix()
    successMsg.value = `Permiso "${perm.key}" eliminado.`
    setTimeout(() => { successMsg.value = null }, 3000)
  } catch (e: any) {
    error.value = e.message
  }
}

async function loadActiveTab() {
  if (activeTab.value === 'roles') await Promise.all([loadMatrix(), loadPlans(), loadModuleCatalog()])
  else if (activeTab.value === 'profiles') await Promise.all([loadProfileMatrix(), loadModuleCatalog()])
  else await loadSystemModules()
}

watch(activeTab, () => { void loadActiveTab() })
onMounted(() => { void loadActiveTab() })
</script>
