<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-full p-6">
      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Permisos por Usuario</h1>
          <p class="text-sm text-gray-500 mt-1">
            Gestiona permisos individuales para usuarios específicos. 
            <span class="text-amber-600 font-medium">Los permisos de usuario sobrescriben los del rol.</span>
          </p>
        </div>
        <div class="flex gap-3 flex-shrink-0">
          <NuxtLink
            to="/permissions"
            class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            ← Volver a Matriz de Roles
          </NuxtLink>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-sm font-medium text-gray-700 mb-1">Buscar usuario</label>
            <input
              v-model="search"
              type="text"
              placeholder="Nombre, email..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              @input="debouncedSearch"
            />
          </div>
          <div class="w-48">
            <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              v-model="filterRole"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              @change="loadUsers"
            >
              <option value="">Todos</option>
              <option value="ADMIN">Admin</option>
              <option value="COMMERCE">Comercio</option>
              <option value="FREELANCER">Freelancer</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              @click="loadUsers"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <svg class="w-4 h-4 inline mr-1.5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Recargar
            </button>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {{ error }}
      </div>

      <!-- Tabla de usuarios -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-gray-700">Usuario</th>
                <th class="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
                <th class="text-center px-4 py-3 font-semibold text-gray-700">Permisos Personalizados</th>
                <th class="text-center px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th class="text-right px-4 py-3 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50/80 transition-colors">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                      {{ user.firstName[0] }}{{ user.lastName[0] }}
                    </div>
                    <div>
                      <div class="font-medium text-gray-800">{{ user.firstName }} {{ user.lastName }}</div>
                      <div class="text-xs text-gray-500">{{ user.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="ROLE_BADGE_CLASSES[user.role]"
                  >
                    {{ ROLE_LABELS[user.role] }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    v-if="user.hasCustomPermissions"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    Personalizado
                  </span>
                  <span v-else class="text-gray-400 text-xs">Usa rol por defecto</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
                  >
                    {{ user.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    @click="openUserPermissions(user)"
                    class="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Gestionar Permisos
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && users.length === 0" class="text-center py-16 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          <p class="font-medium">No se encontraron usuarios</p>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.pages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div class="text-sm text-gray-500">
            Mostrando {{ (pagination.page - 1) * pagination.limit + 1 }} - {{ Math.min(pagination.page * pagination.limit, pagination.total) }} de {{ pagination.total }}
          </div>
          <div class="flex gap-2">
            <button
              @click="changePage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <button
              @click="changePage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.pages"
              class="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de permisos de usuario -->
    <UserPermissionsModal
      v-if="selectedUser"
      :user="selectedUser"
      :is-open="showModal"
      @close="closeModal"
      @saved="loadUsers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ROLE_LABELS, ROLE_BADGE_CLASSES, type Role } from '~/config/roles.config'
import type { PermissionsUser } from '~/composables/users/useUserPermissions'
import UserPermissionsModal from '~/components/permissions/UserPermissionsModal.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const { listUsers, getUserPermissions, loading, error } = useUserPermissions()

const users = ref<PermissionsUser[]>([])
const search = ref('')
const filterRole = ref<Role | ''>('')
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 1 })
const selectedUser = ref<PermissionsUser | null>(null)
const showModal = ref(false)

let searchTimeout: ReturnType<typeof setTimeout>

async function loadUsers() {
  try {
    const result = await listUsers({
      role: filterRole.value || undefined,
      search: search.value || undefined,
      page: pagination.value.page,
      limit: pagination.value.limit,
    })
    users.value = result.users
    pagination.value = result.pagination
  } catch (e: any) {
    error.value = e.message
  }
}

function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    loadUsers()
  }, 300)
}

function changePage(newPage: number) {
  pagination.value.page = newPage
  loadUsers()
}

function openUserPermissions(user: PermissionsUser) {
  selectedUser.value = user
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedUser.value = null
}

// Soporta el link "Ver permisos" desde /users (?userId=X): resuelve el
// usuario vía getUserPermissions (ya trae los datos básicos) en vez de
// depender de que esté en la página actual del listado paginado, y abre
// el modal directamente sin esperar a que el admin lo busque de nuevo.
async function openFromQuery() {
  const userId = route.query.userId
  if (typeof userId !== 'string' || !userId) return

  router.replace({ query: { ...route.query, userId: undefined } })

  try {
    const { user } = await getUserPermissions(userId)
    openUserPermissions(user)
  } catch (e: any) {
    error.value = e.message
  }
}

onMounted(() => {
  loadUsers()
  openFromQuery()
})
</script>
