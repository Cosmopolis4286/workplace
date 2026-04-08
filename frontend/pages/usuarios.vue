<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-slate-700 via-blue-700 to-indigo-700 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Usuarios</h1>
            <p class="text-blue-100">Administración de cuentas y roles del sistema</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="showCategoryModal = true"
            class="flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl transition-all duration-200"
            title="Gestionar categorías y módulos"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span class="font-medium text-sm">Categorías</span>
          </button>
          <button
            @click="openCreate()"
            class="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span class="font-medium">Nuevo Usuario</span>
          </button>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- Error Banner -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {{ error }}
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 space-y-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1 relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              v-model="search"
              @input="onSearch"
              type="text"
              placeholder="Buscar por nombre o correo..."
              class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            v-model="roleFilter"
            @change="page = 1; load()"
            class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos los roles</option>
            <option v-for="r in availableRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <select
            v-model="categoryFilter"
            @change="subcategoryFilter = ''; page = 1; load()"
            class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todas las categorías</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.icon ? cat.icon + ' ' : '' }}{{ cat.name }}
            </option>
          </select>
          <select
            v-model="subcategoryFilter"
            :disabled="!categoryFilter"
            @change="page = 1; load()"
            class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Todas las subcategorías</option>
            <option v-for="sub in filterSubcategories" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
          </select>
          <button
            v-if="roleFilter || categoryFilter || subcategoryFilter || search"
            @click="resetFilters"
            class="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <!-- Action bar (visible cuando hay selección o siempre si no hay selección) -->
      <div class="flex items-center gap-2 mb-4 min-h-[36px]">
        <template v-if="selectedUsers.length > 0">
          <span class="text-sm text-gray-500 mr-1">{{ selectedUsers.length }} seleccionado{{ selectedUsers.length > 1 ? 's' : '' }}</span>
          <button
            @click="openEditSelected"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            :disabled="selectedUsers.length !== 1 || !canManage(selectedUsers[0])"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Editar
          </button>
          <button
            @click="confirmDeleteSelected"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
            :disabled="!selectedUsers.every(u => canManage(u))"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Eliminar{{ selectedUsers.length > 1 ? ` (${selectedUsers.length})` : '' }}
          </button>
          <button
            @click="selectedUsers = []"
            class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Deseleccionar
          </button>
        </template>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 6" :key="i" class="h-20 bg-gray-100 rounded-2xl animate-pulse"/>
      </div>

      <!-- Users table -->
      <UiAppTable
        v-else
        :rows="filteredUsers"
        row-key="id"
        selectable
        v-model:selected="selectedUsers"
        :total="total"
        :page-size="limit"
        :current-page="page"
        total-label="usuarios en total"
        :slots-colspan="4"
        @page-change="page = $event; load()"
      >
        <template #headers>
          <th class="text-left px-4 py-3 font-semibold text-gray-600">Usuario</th>
          <th class="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
          <th class="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Categoría</th>
          <th class="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Establecimiento</th>
          <th class="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
        </template>

        <template #row="{ row: u }">
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                   :class="ROLE_AVATAR_COLORS[u.role]">
                {{ u.firstName[0] }}{{ u.lastName[0] }}
              </div>
              <div>
                <div class="font-medium text-gray-800">{{ u.firstName }} {{ u.lastName }}</div>
                <div class="text-xs text-gray-400">{{ u.email }}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="ROLE_BADGE_CLASSES[u.role]">
              {{ ROLE_LABELS[u.role] }}
            </span>
          </td>
          <td class="px-4 py-3 hidden lg:table-cell">
            <template v-if="u.category">
              <div class="flex items-center gap-1.5">
                <span class="text-base leading-none">{{ u.category.icon }}</span>
                <span class="text-xs font-medium text-gray-700">{{ u.category.name }}</span>
              </div>
              <div v-if="u.subcategory" class="text-xs text-gray-400 mt-0.5 pl-0.5">{{ u.subcategory.name }}</div>
            </template>
            <span v-else class="text-xs text-gray-400">—</span>
          </td>
          <td class="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
            {{ u.restaurant?.name ?? '—' }}
          </td>
          <td class="px-4 py-3" @click.stop>
            <button
              @click="toggleStatus(u)"
              :disabled="!canManage(u)"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              :class="u.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="u.isActive ? 'bg-green-500' : 'bg-gray-400'"/>
              {{ u.isActive ? 'Activo' : 'Inactivo' }}
            </button>
          </td>
        </template>

        <template #empty>
          <svg class="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          <p class="font-medium">No se encontraron usuarios</p>
        </template>
      </UiAppTable>
    </div>

    <!-- Modal crear/editar usuario -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" @click.self="showModal = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <!-- Header fijo -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 class="text-base font-bold text-gray-800">{{ editing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
                <p class="text-xs text-gray-400 mt-0.5">{{ editing ? 'Modifica los datos del usuario' : 'Completa los datos para crear la cuenta' }}</p>
              </div>
              <button @click="showModal = false" class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Body con scroll -->
            <form id="user-form" @submit.prevent="save" class="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Nombre <span class="text-red-500">*</span></label>
                  <input v-model="form.firstName" required type="text"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"/>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Apellido <span class="text-red-500">*</span></label>
                  <input v-model="form.lastName" required type="text"
                    class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"/>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Correo electrónico <span class="text-red-500">*</span></label>
                <input v-model="form.email" required type="email"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"/>
              </div>

              <div v-if="!editing">
                <label class="block text-xs font-medium text-gray-600 mb-1">Contraseña <span class="text-red-500">*</span></label>
                <input v-model="form.password" required type="password" minlength="8"
                  placeholder="Mínimo 8 caracteres"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"/>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Teléfono <span class="text-gray-300">(opcional)</span></label>
                <input v-model="form.phone" type="tel"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"/>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Rol <span class="text-red-500">*</span></label>
                <select v-model="form.role" required
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white">
                  <option v-for="r in creatableRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </div>

              <div v-if="(form.role === 'COMMERCE' || form.role === 'FREELANCER') && !editing">
                <label class="block text-xs font-medium text-gray-600 mb-1">
                  {{ form.role === 'FREELANCER' ? 'Nombre del negocio / establecimiento' : 'Nombre del comercio' }}
                  <span class="text-gray-300">(opcional)</span>
                </label>
                <input v-model="form.commerceName" type="text"
                  :placeholder="form.role === 'FREELANCER' ? 'Mi negocio o establecimiento' : 'Se puede configurar después'"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"/>
              </div>

              <!-- Categoría / Subcategoría -->
              <div class="p-4 bg-gray-50 rounded-xl space-y-3">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clasificación del perfil</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                    <select v-model="form.categoryId" @change="form.subcategoryId = ''"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white">
                      <option value="">Sin categoría</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.icon ? cat.icon + ' ' : '' }}{{ cat.name }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Subcategoría</label>
                    <select v-model="form.subcategoryId"
                      :disabled="!form.categoryId"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed">
                      <option value="">Sin subcategoría</option>
                      <option v-for="sub in availableSubcategories" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div v-if="formError" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-start gap-2">
                <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ formError }}
              </div>
            </form>

            <!-- Footer fijo -->
            <div class="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button type="button" @click="showModal = false"
                class="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="user-form" :disabled="saving"
                class="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {{ saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear usuario') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal confirmar eliminación -->
    <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">
          {{ bulkDeleteTargets.length > 1 ? `¿Eliminar ${bulkDeleteTargets.length} usuarios?` : '¿Eliminar usuario?' }}
        </h3>
        <p class="text-sm text-gray-500 mb-6">
          <template v-if="bulkDeleteTargets.length > 1">
            Se eliminarán permanentemente <strong>{{ bulkDeleteTargets.length }} cuentas</strong>.
          </template>
          <template v-else>
            Se eliminará permanentemente la cuenta de
            <strong>{{ deleteTarget.firstName }} {{ deleteTarget.lastName }}</strong>.
          </template>
          Esta acción no se puede deshacer.
        </p>
        <div class="flex gap-3">
          <button @click="deleteTarget = null; bulkDeleteTargets = []"
            class="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button @click="doDelete" :disabled="saving"
            class="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {{ saving ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal categorías & módulos -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <CategoryModulesModal
          v-if="showCategoryModal"
          @close="showCategoryModal = false"
          @updated="loadCategories"
        />
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })

const { invalidate: invalidateModules } = useModules()

type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

interface UserSubcategory { id: string; name: string }
interface UserCategory    { id: string; name: string; icon?: string; allowedModules: string[]; subcategories: UserSubcategory[]; _count?: { users: number } }

interface UserItem {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: Role
  isActive: boolean
  createdAt: string
  restaurant?:   { id: string; name: string }
  category?:     { id: string; name: string; icon?: string } | null
  subcategory?:  { id: string; name: string } | null
}

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
  NORMAL: 'bg-gray-100 text-gray-600',
}

const ROLE_AVATAR_COLORS: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-600',
  ADMIN: 'bg-blue-600',
  COMMERCE: 'bg-green-600',
  FREELANCER: 'bg-yellow-500',
  NORMAL: 'bg-gray-500',
}

const { user, getHeaders, refreshAccessToken } = useAuth()
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

const isSuperAdmin = computed(() => user.value?.role === 'SUPERADMIN')

// Roles que el caller puede crear/ver
const availableRoles = computed<{ value: Role; label: string }[]>(() =>
  isSuperAdmin.value
    ? [
        { value: 'SUPERADMIN', label: 'SuperAdmin' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'COMMERCE', label: 'Comercio' },
        { value: 'FREELANCER', label: 'Freelancer' },
        { value: 'NORMAL', label: 'Normal' },
      ]
    : [
        { value: 'COMMERCE', label: 'Comercio' },
        { value: 'FREELANCER', label: 'Freelancer' },
        { value: 'NORMAL', label: 'Normal' },
      ]
)

const creatableRoles = availableRoles

// El caller puede gestionar a este user?
function canManage(u: UserItem): boolean {
  if (u.id === user.value?.id) return false // no self-manage
  if (isSuperAdmin.value) return true
  return !['SUPERADMIN', 'ADMIN'].includes(u.role)
}

// Categories state
const categories = ref<UserCategory[]>([])

const availableSubcategories = computed<UserSubcategory[]>(() => {
  if (!form.value.categoryId) return []
  return categories.value.find(c => c.id === form.value.categoryId)?.subcategories ?? []
})

// Filter subcategories (for the filter bar, not the form)
const filterSubcategories = computed<UserSubcategory[]>(() => {
  if (!categoryFilter.value) return []
  return categories.value.find(c => c.id === categoryFilter.value)?.subcategories ?? []
})

// State
const users = ref<UserItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const total = ref(0)
const page = ref(1)
const limit = 20
const roleFilter = ref<string>('')
const categoryFilter = ref<string>('')
const subcategoryFilter = ref<string>('')
const search = ref('')
let searchTimer: ReturnType<typeof setTimeout>

const totalPages = computed(() => Math.ceil(total.value / limit))

const filteredUsers = computed(() =>
  search.value.trim()
    ? users.value.filter(u =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.value.toLowerCase())
      )
    : users.value
)

// Selection state
const selectedUsers = ref<UserItem[]>([])

function openEditSelected() {
  if (selectedUsers.value.length === 1) openEdit(selectedUsers.value[0])
}

function confirmDeleteSelected() {
  if (selectedUsers.value.length === 1) {
    confirmDelete(selectedUsers.value[0])
  } else if (selectedUsers.value.length > 1) {
    deleteTarget.value = selectedUsers.value[0] // trigger modal with first; bulk handled below
    bulkDeleteTargets.value = [...selectedUsers.value]
  }
}

// Modal state
const showModal = ref(false)
const showCategoryModal = ref(false)
const editing = ref<UserItem | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const deleteTarget = ref<UserItem | null>(null)
const bulkDeleteTargets = ref<UserItem[]>([])

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  role: 'COMMERCE' as Role,
  commerceName: '',
  categoryId: '',
  subcategoryId: '',
})

// API helper
const { get, post, put, del } = useApi()

async function loadCategories() {
  try {
    categories.value = await get<UserCategory[]>('/users/categories')
  } catch { /* silently ignore */ }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit) })
    if (roleFilter.value) params.set('role', roleFilter.value)
    if (categoryFilter.value) params.set('categoryId', categoryFilter.value)
    if (subcategoryFilter.value) params.set('subcategoryId', subcategoryFilter.value)
    const res = await apiFetch<{ data: UserItem[]; total: number }>(`/users?${params}`)
    users.value = res.data
    total.value = res.total
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  search.value = ''
  roleFilter.value = ''
  categoryFilter.value = ''
  subcategoryFilter.value = ''
  page.value = 1
  load()
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
}

function openCreate() {
  editing.value = null
  form.value = { firstName: '', lastName: '', email: '', password: '', phone: '', role: 'COMMERCE', commerceName: '', categoryId: '', subcategoryId: '' }
  formError.value = null
  showModal.value = true
}

function openEdit(u: UserItem) {
  editing.value = u
  form.value = {
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    password: '',
    phone: u.phone ?? '',
    role: u.role,
    commerceName: '',
    categoryId: u.category?.id ?? '',
    subcategoryId: u.subcategory?.id ?? '',
  }
  formError.value = null
  showModal.value = true
}

async function save() {
  saving.value = true
  formError.value = null
  try {
    if (editing.value) {
      const body: Record<string, unknown> = {
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        email: form.value.email,
        phone: form.value.phone || undefined,
        role: form.value.role,
        categoryId: form.value.categoryId || null,
        subcategoryId: form.value.subcategoryId || null,
      }
      const { put } = useApi()
      await put(`/users/${editing.value.id}`, body)
    } else {
      const body: Record<string, unknown> = {
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        email: form.value.email,
        password: form.value.password,
        phone: form.value.phone || undefined,
        role: form.value.role,
        commerceName: form.value.commerceName || undefined,
        categoryId: form.value.categoryId || undefined,
        subcategoryId: form.value.subcategoryId || undefined,
      }
      const { post } = useApi()
      await post('/users', body)
    }
    showModal.value = false
    selectedUsers.value = []
    invalidateModules() // category or role may have changed → re-fetch effective modules
    await load()
  } catch (e: unknown) {
    formError.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

async function toggleStatus(u: UserItem) {
  try {
    const { patch } = useApi()
    await patch(`/users/${u.id}/toggle-status`)
    u.isActive = !u.isActive
  } catch (e: unknown) {
    error.value = (e as Error).message
  }
}

function confirmDelete(u: UserItem) {
  deleteTarget.value = u
}

async function doDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    const targets = bulkDeleteTargets.value.length > 0 ? bulkDeleteTargets.value : [deleteTarget.value]
    const { del } = useApi()
    await Promise.all(targets.map(u => del(`/users/${u.id}`)))
    deleteTarget.value = null
    bulkDeleteTargets.value = []
    selectedUsers.value = []
    await load()
  } catch (e: unknown) {
    error.value = (e as Error).message
    deleteTarget.value = null
    bulkDeleteTargets.value = []
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
  loadCategories()
})
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
</style>
