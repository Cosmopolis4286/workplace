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

      <SystemModulesPanel
        :loading="loadingModules"
        :modules="systemModules"
        :toggling-module="togglingModule"
        :module-labels="MODULE_LABELS"
        @toggle="toggleSystemModule"
      />

      <PermissionMatrixTable
        :loading="loading"
        :permissions="permissions"
        :grouped-permissions="groupedPermissions"
        :roles="ROLES"
        :role-labels="ROLE_LABELS"
        :role-badge-classes="ROLE_BADGE_CLASSES"
        :module-labels="MODULE_LABELS"
        :plans-for-module="plansForModule"
        :local-matrix="localMatrix"
        disabled-column-key="SUPERADMIN"
        @toggle="toggleLocal"
        @delete="confirmDelete"
      />

      <!-- Matriz por Perfil (UserProfile — perfiles múltiples) -->
      <div class="mt-8">
        <PageHeader
          title="Matriz de Permisos por Perfil"
          description="Permisos otorgados por cada UserProfile activo (perfiles múltiples). Un usuario con varios perfiles activos obtiene la unión de sus permisos, sumada a los de su rol RBAC."
          :icon="ShieldCheckIcon"
        >
          <template #actions>
            <HeaderActionButton
              variant="primary"
              :icon="savingProfile ? ArrowPathIcon : undefined"
              :loading="savingProfile"
              :disabled="savingProfile || pendingProfileChanges.length === 0"
              @click="saveAllProfile"
            >
              {{ savingProfile ? 'Guardando...' : `Guardar cambios${pendingProfileChanges.length > 0 ? ` (${pendingProfileChanges.length})` : ''}` }}
            </HeaderActionButton>
          </template>
        </PageHeader>

        <PermissionMatrixTable
          :loading="loadingProfileMatrix"
          :permissions="profilePermissions"
          :grouped-permissions="groupedProfilePermissions"
          :roles="PROFILE_KEYS"
          :role-labels="PROFILE_LABELS"
          :role-badge-classes="PROFILE_BADGE_CLASSES"
          :module-labels="MODULE_LABELS"
          :plans-for-module="{}"
          :local-matrix="localProfileMatrix"
          @toggle="toggleProfileLocal"
          @delete="() => {}"
        />
      </div>

      <!-- Footer info -->
      <div class="mt-4 text-xs text-gray-400 flex items-center gap-4">
        <span>{{ permissions.length }} permisos totales</span>
        <span v-if="pendingChanges.length > 0" class="text-amber-600 font-medium">
          {{ pendingChanges.length }} cambio(s) sin guardar
        </span>
      </div>

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
      @close="showNewPermModal = false"
      @submit="saveNewPerm"
      @module-change="autoFillKey"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import { ShieldCheckIcon, PlusIcon, UserGroupIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import SystemModulesPanel from '~/components/admin/permissions/SystemModulesPanel.vue'
import PermissionMatrixTable from '~/components/admin/permissions/PermissionMatrixTable.vue'
import NewPermissionModal, { type NewPermissionForm } from '~/components/admin/permissions/NewPermissionModal.vue'
import { useApi } from '~/composables/core/useApi'
import { useAuth } from '~/composables/auth/useAuth'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useModuleCatalog } from '~/composables/commerce/useModuleCatalog'

definePageMeta({ middleware: 'auth' })

type Role = 'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL'

const ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'PROFESIONAL', 'NORMAL']

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

const profilePermissions = ref<ProfilePermissionRow[]>([])
const localProfileMatrix = ref<Record<string, Record<string, boolean>>>({})
const pendingProfileChanges = ref<PendingProfileChange[]>([])
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
  { label: 'Sin guardar', value: pendingChanges.value.length },
])

const { get, post, patch, del } = useApi()
const { confirm } = useConfirm()

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

async function loadProfileMatrix() {
  loadingProfileMatrix.value = true
  try {
    const data = await get('/permissions/profile-matrix')
    profilePermissions.value = data

    const matrix: Record<string, Record<string, boolean>> = {}
    for (const p of data) {
      matrix[p.id] = {}
      for (const key of PROFILE_KEYS) {
        matrix[p.id][key] = p.profiles[key] ?? false
      }
    }
    localProfileMatrix.value = matrix
    pendingProfileChanges.value = []
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    loadingProfileMatrix.value = false
  }
}

function toggleProfileLocal(permissionId: string, profileKey: string, granted: boolean) {
  if (!localProfileMatrix.value[permissionId]) return
  localProfileMatrix.value[permissionId][profileKey] = granted

  const { profileType, subtype } = PROFILE_KEY_TO_PARTS[profileKey]
  const existing = pendingProfileChanges.value.findIndex(
    c => c.permissionId === permissionId && c.profileType === profileType && c.subtype === subtype
  )
  if (existing >= 0) {
    pendingProfileChanges.value[existing].granted = granted
  } else {
    pendingProfileChanges.value.push({ profileType, subtype, permissionId, granted })
  }
}

async function saveAllProfile() {
  if (pendingProfileChanges.value.length === 0) return
  savingProfile.value = true
  error.value = null
  successMsg.value = null
  try {
    const count = pendingProfileChanges.value.length
    await patch('/permissions/profile-bulk', { updates: pendingProfileChanges.value })
    pendingProfileChanges.value = []
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

async function confirmDelete(perm: PermissionRow) {
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

onMounted(() => { loadMatrix(); loadProfileMatrix(); loadPlans(); loadSystemModules(); loadModuleCatalog() })
</script>
