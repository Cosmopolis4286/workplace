<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                Permisos de {{ user.firstName }} {{ user.lastName }}
              </h3>
              <p class="text-sm text-gray-500">{{ user.email }} • Rol: {{ ROLE_LABELS[user.role] }}</p>
            </div>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div v-if="!canManageThisUser" class="px-6 py-3 bg-amber-50 border-b border-amber-100 text-sm text-amber-800">
          No tienes permiso para modificar los permisos de este usuario (rol {{ ROLE_LABELS[user.role] }}). Puedes revisar su configuración, pero las acciones de conceder/denegar están deshabilitadas.
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-hidden flex">
          <UserPermissionsSidebar
            :role-permissions-count="rolePermissionsCount"
            :user-permissions-count="userPermissionsCount"
            :effective-permissions-count="effectivePermissionsCount"
            :has-custom-permissions="hasCustomPermissions"
            :resetting="resetting"
            :can-manage-this-user="canManageThisUser"
            @reset="resetPermissions"
          />

          <!-- Main: Lista de permisos -->
          <div class="flex-1 overflow-hidden flex flex-col">
            <!-- Filtros -->
            <div class="p-4 border-b border-gray-200 space-y-2">
              <input
                v-model="search"
                type="text"
                placeholder="Buscar permiso..."
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div class="flex gap-2">
                <button
                  v-for="filter in filters"
                  :key="filter.value"
                  @click="activeFilter = filter.value"
                  :class="[
                    'px-2 py-1 text-xs rounded-full transition-colors',
                    activeFilter === filter.value
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  {{ filter.label }}
                </button>
              </div>
            </div>

            <!-- Lista scrollable -->
            <div class="flex-1 overflow-y-auto p-4">
              <div v-if="loading" class="space-y-2">
                <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 rounded-lg animate-pulse"/>
              </div>

              <div v-else-if="filteredPermissions.length === 0" class="text-center py-8 text-gray-400">
                No se encontraron permisos
              </div>

              <div v-else class="space-y-2">
                <UserPermissionCard
                  v-for="perm in filteredPermissions"
                  :key="perm.permissionId"
                  :perm="perm"
                  :saving="saving === perm.permissionId"
                  :can-manage-this-user="canManageThisUser"
                  :action-active="activeAction?.permissionId === perm.permissionId"
                  :action-type="activeAction?.permissionId === perm.permissionId ? activeAction.type : undefined"
                  :action-reason="actionReason"
                  :action-expires-at="actionExpiresAt"
                  :format-date="formatDate"
                  @start-action="(type) => startAction(perm, type)"
                  @cancel-action="activeAction = null"
                  @confirm-action="confirmAction"
                  @remove="removeUserPermission(perm.permissionId)"
                  @update:action-reason="actionReason = $event"
                  @update:action-expires-at="actionExpiresAt = $event"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <ResetPermissionsConfirmModal
    :show="showResetConfirm"
    :resetting="resetting"
    @close="showResetConfirm = false"
    @confirm="confirmResetPermissions"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PermissionsUser, UserPermission } from '~/composables/users/useUserPermissions'
import { ROLE_LABELS } from '~/config/roles.config'
import UserPermissionsSidebar from '~/components/permissions/UserPermissionsSidebar.vue'
import UserPermissionCard from '~/components/permissions/UserPermissionCard.vue'
import ResetPermissionsConfirmModal from '~/components/permissions/ResetPermissionsConfirmModal.vue'

interface Props {
  user: PermissionsUser
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  saved: []
}>()

const { getUserPermissions, updateUserPermission, removeUserPermission: apiRemoveUserPermission, resetUserPermissions: apiResetUserPermissions } = useUserPermissions()
const { canManage } = useRoleHierarchy()
// El backend (PermissionsService.validateUserAccess) ya rechaza esto con
// 403 — replicado aquí solo para no ofrecer una acción que sabemos que
// será rechazada (ver FRONTEND_AUDIT.md).
const canManageThisUser = computed(() => canManage(props.user))

const loading = ref(false)
const saving = ref<string | null>(null)
const resetting = ref(false)
const showResetConfirm = ref(false)
const permissions = ref<UserPermission[]>([])
const search = ref('')
const activeFilter = ref<'all' | 'granted' | 'denied' | 'role' | 'custom'>('all')

const activeAction = ref<{ permissionId: string; type: 'grant' | 'deny' } | null>(null)
const actionReason = ref('')
const actionExpiresAt = ref('')

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'granted', label: 'Concedidos' },
  { value: 'denied', label: 'Denegados' },
  { value: 'role', label: 'Del rol' },
  { value: 'custom', label: 'Personalizados' },
]

const hasCustomPermissions = computed(() =>
  permissions.value.some(p => p.userGranted !== null)
)

const rolePermissionsCount = computed(() =>
  permissions.value.filter(p => p.roleGranted && p.userGranted === null).length
)

const userPermissionsCount = computed(() =>
  permissions.value.filter(p => p.userGranted !== null).length
)

const effectivePermissionsCount = computed(() =>
  permissions.value.filter(p => p.effectiveGranted).length
)

const filteredPermissions = computed(() => {
  let result = permissions.value

  // Filtrar por búsqueda
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      p.module.toLowerCase().includes(q)
    )
  }

  // Filtrar por tipo
  switch (activeFilter.value) {
    case 'granted':
      result = result.filter(p => p.effectiveGranted)
      break
    case 'denied':
      result = result.filter(p => !p.effectiveGranted && p.userGranted !== null)
      break
    case 'role':
      result = result.filter(p => p.source === 'role')
      break
    case 'custom':
      result = result.filter(p => p.userGranted !== null)
      break
  }

  return result
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function loadPermissions() {
  loading.value = true
  try {
    const result = await getUserPermissions(props.user.id)
    permissions.value = result.allPermissions
  } catch (e: any) {
    console.error('Error loading permissions:', e)
  } finally {
    loading.value = false
  }
}

function startAction(perm: UserPermission, type: 'grant' | 'deny') {
  activeAction.value = { permissionId: perm.permissionId, type }
  actionReason.value = ''
  actionExpiresAt.value = ''
}

async function confirmAction() {
  if (!activeAction.value) return
  const { permissionId, type } = activeAction.value
  saving.value = permissionId
  try {
    await updateUserPermission(props.user.id, {
      permissionId,
      granted: type === 'grant',
      reason: actionReason.value.trim() || undefined,
      expiresAt: actionExpiresAt.value || undefined,
    })
    activeAction.value = null
    await loadPermissions()
    emit('saved')
  } finally {
    saving.value = null
  }
}

async function removeUserPermission(permissionId: string) {
  saving.value = permissionId
  try {
    await apiRemoveUserPermission(props.user.id, permissionId)
    await loadPermissions()
    emit('saved')
  } finally {
    saving.value = null
  }
}

function resetPermissions() {
  showResetConfirm.value = true
}

async function confirmResetPermissions() {
  resetting.value = true
  try {
    await apiResetUserPermissions(props.user.id)
    await loadPermissions()
    emit('saved')
  } finally {
    resetting.value = false
    showResetConfirm.value = false
  }
}

watch(() => props.isOpen, (open) => {
  if (open) loadPermissions()
})
</script>
