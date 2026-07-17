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

        <!-- Content -->
        <div class="flex-1 overflow-hidden flex">
          <!-- Sidebar: Resumen -->
          <div class="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-4">
            <div class="bg-white rounded-lg p-3 border border-gray-200">
              <div class="text-xs text-gray-500 uppercase font-semibold">Estado Actual</div>
              <div class="mt-2 space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Permisos del rol:</span>
                  <span class="font-medium text-blue-600">{{ rolePermissionsCount }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Personalizados:</span>
                  <span class="font-medium text-amber-600">{{ userPermissionsCount }}</span>
                </div>
                <div class="flex justify-between border-t pt-1 mt-1">
                  <span class="text-gray-800 font-medium">Total efectivos:</span>
                  <span class="font-bold text-green-600">{{ effectivePermissionsCount }}</span>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg p-3 border border-gray-200">
              <div class="text-xs text-gray-500 uppercase font-semibold mb-2">Leyenda</div>
              <div class="space-y-2 text-xs">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded bg-blue-500"></span>
                  <span class="text-gray-600">Del rol</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded bg-green-500"></span>
                  <span class="text-gray-600">Concedido al usuario</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded bg-red-500"></span>
                  <span class="text-gray-600">Denegado al usuario</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded bg-gray-300"></span>
                  <span class="text-gray-600">No disponible</span>
                </div>
              </div>
            </div>

            <button
              v-if="hasCustomPermissions"
              @click="resetPermissions"
              :disabled="resetting"
              class="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <svg v-if="resetting" class="w-4 h-4 inline mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {{ resetting ? 'Reseteando...' : 'Resetear permisos' }}
            </button>
          </div>

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
                <div
                  v-for="perm in filteredPermissions"
                  :key="perm.permissionId"
                  class="border rounded-lg p-3 transition-colors"
                  :class="getPermissionCardClass(perm)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-800">{{ perm.label }}</span>
                        <span
                          v-if="perm.isSystem"
                          class="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded"
                        >Sistema</span>
                      </div>
                      <div class="text-xs text-gray-500 font-mono mt-0.5">{{ perm.key }}</div>
                      <div class="text-xs text-gray-400 mt-1">
                        {{ perm.module }} • {{ perm.action }}
                      </div>
                      
                      <!-- Mostrar expiración y razón si existen -->
                      <div v-if="perm.expiresAt || perm.reason" class="mt-2 text-xs space-y-1">
                        <div v-if="perm.expiresAt" class="text-amber-600">
                          ⏰ Expira: {{ formatDate(perm.expiresAt) }}
                        </div>
                        <div v-if="perm.reason" class="text-gray-500 italic">
                          "{{ perm.reason }}"
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-col items-end gap-1">
                      <!-- Badge de origen -->
                      <span
                        class="px-2 py-0.5 text-[10px] rounded-full font-medium"
                        :class="getSourceBadgeClass(perm)"
                      >
                        {{ perm.source === 'role' ? 'Rol' : perm.source === 'user' ? 'Usuario' : 'No' }}
                      </span>

                      <!-- Botones de acción -->
                      <div class="flex gap-1 mt-2">
                        <button
                          v-if="!perm.effectiveGranted"
                          @click="grantPermission(perm)"
                          :disabled="saving === perm.permissionId"
                          class="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Conceder"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        </button>
                        <button
                          v-if="perm.effectiveGranted"
                          @click="denyPermission(perm)"
                          :disabled="saving === perm.permissionId"
                          class="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Denegar"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                        <button
                          v-if="perm.userGranted !== null"
                          @click="removeUserPermission(perm.permissionId)"
                          :disabled="saving === perm.permissionId"
                          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Eliminar personalización"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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

  <!-- Confirmación de reset -->
  <Teleport to="body">
    <div v-if="showResetConfirm" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold text-gray-900 mb-2">¿Resetear permisos?</h3>
        <p class="text-sm text-gray-500 mb-6">
          Se eliminarán todos los permisos personalizados de este usuario. Volverá a usar solo los permisos de su rol.
        </p>
        <div class="flex gap-3">
          <button
            @click="showResetConfirm = false"
            class="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >Cancelar</button>
          <button
            @click="confirmResetPermissions"
            :disabled="resetting"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
          >{{ resetting ? 'Reseteando...' : 'Resetear' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { User, UserPermission } from '~/composables/useUserPermissions'

interface Props {
  user: User
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  saved: []
}>()

const { getUserPermissions, updateUserPermission, removeUserPermission: apiRemoveUserPermission, resetUserPermissions: apiResetUserPermissions } = useUserPermissions()

const loading = ref(false)
const saving = ref<string | null>(null)
const resetting = ref(false)
const showResetConfirm = ref(false)
const permissions = ref<UserPermission[]>([])
const search = ref('')
const activeFilter = ref<'all' | 'granted' | 'denied' | 'role' | 'custom'>('all')

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'granted', label: 'Concedidos' },
  { value: 'denied', label: 'Denegados' },
  { value: 'role', label: 'Del rol' },
  { value: 'custom', label: 'Personalizados' },
]

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  COMMERCE: 'Comercio',
  FREELANCER: 'Freelancer',
  NORMAL: 'Normal',
}

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

function getPermissionCardClass(perm: UserPermission) {
  if (perm.userGranted === true) return 'border-green-200 bg-green-50/50'
  if (perm.userGranted === false) return 'border-red-200 bg-red-50/50'
  if (perm.roleGranted) return 'border-blue-200 bg-blue-50/30'
  return 'border-gray-200 bg-white'
}

function getSourceBadgeClass(perm: UserPermission) {
  if (perm.source === 'user') {
    return perm.effectiveGranted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  }
  if (perm.source === 'role') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-500'
}

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

async function grantPermission(perm: UserPermission) {
  saving.value = perm.permissionId
  try {
    await updateUserPermission(props.user.id, {
      permissionId: perm.permissionId,
      granted: true,
      reason: 'Concedido manualmente',
    })
    await loadPermissions()
    emit('saved')
  } finally {
    saving.value = null
  }
}

async function denyPermission(perm: UserPermission) {
  saving.value = perm.permissionId
  try {
    await updateUserPermission(props.user.id, {
      permissionId: perm.permissionId,
      granted: false,
      reason: 'Denegado manualmente',
    })
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
