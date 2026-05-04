<template>
  <div>
    <PageHeader
      title="Gestión de Usuarios"
      description="Administración de cuentas y roles del sistema"
      :icon="UsersIcon"
      :breadcrumb="[{ label: 'Usuarios' }]"
      :stats="headerStats"
    >
      <template #actions>
        <button class="btn-secondary flex items-center gap-2" @click="showCategoryModal = true">
          <Squares2X2Icon class="h-4 w-4" />
          Categorías
        </button>
        <button class="btn-primary flex items-center gap-2" @click="openCreate">
          <PlusIcon class="h-5 w-5" />
          Nuevo Usuario
        </button>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- Filtros -->
    <div class="card p-4 mb-6 space-y-3">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            v-model="search"
            @input="onSearch"
            type="text"
            placeholder="Buscar por nombre o correo..."
            class="input-field pl-9"
          />
        </div>
        <select v-model="roleFilter" class="input-field w-auto" @change="page = 1; load()">
          <option value="">Todos los roles</option>
          <option v-for="r in availableRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </div>
      <div class="flex flex-col sm:flex-row gap-3">
        <select v-model="categoryFilter" class="input-field flex-1" @change="subcategoryFilter = ''; page = 1; load()">
          <option value="">Todas las categorías</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.icon ? cat.icon + ' ' : '' }}{{ cat.name }}
          </option>
        </select>
        <select v-model="subcategoryFilter" :disabled="!categoryFilter" class="input-field flex-1 disabled:opacity-50 disabled:cursor-not-allowed" @change="page = 1; load()">
          <option value="">Todas las subcategorías</option>
          <option v-for="sub in filterSubcategories" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
        </select>
        <button
          v-if="roleFilter || categoryFilter || subcategoryFilter || search"
          class="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap"
          @click="resetFilters"
        >Limpiar filtros</button>
      </div>
    </div>

    <!-- Barra de acciones bulk -->
    <div v-if="selectedUsers.length > 0" class="card p-3 mb-4 flex items-center gap-3 bg-red-50 border-red-200">
      <span class="text-sm font-medium text-red-700">{{ selectedUsers.length }} seleccionado{{ selectedUsers.length > 1 ? 's' : '' }}</span>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-700"
        :disabled="selectedUsers.length !== 1 || !canManage(selectedUsers[0])"
        @click="openEditSelected"
      >
        <PencilIcon class="h-3.5 w-3.5" />Editar
      </button>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        :disabled="!selectedUsers.every(u => canManage(u))"
        @click="confirmDeleteSelected"
      >
        <TrashIcon class="h-3.5 w-3.5" />
        Eliminar{{ selectedUsers.length > 1 ? ` (${selectedUsers.length})` : '' }}
      </button>
      <button class="ml-auto text-xs text-gray-500 hover:text-gray-700" @click="selectedUsers = []">
        Deseleccionar
      </button>
    </div>

    <!-- Tabla -->
    <div class="card overflow-hidden">
      <!-- Skeleton -->
      <div v-if="loading" class="divide-y divide-gray-100">
        <div v-for="i in 6" :key="i" class="p-4 flex items-center gap-4">
          <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
          <div class="flex-1 space-y-2"><div class="skeleton h-4 w-40 rounded" /><div class="skeleton h-3 w-56 rounded" /></div>
          <div class="skeleton h-6 w-20 rounded-full" />
        </div>
      </div>

      <!-- Vacío -->
      <div v-else-if="filteredUsers.length === 0" class="p-12 text-center">
        <UsersIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">No se encontraron usuarios</p>
      </div>

      <!-- Filas -->
      <template v-else>
        <!-- Cabecera -->
        <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div class="col-span-1 flex items-center">
            <input
              type="checkbox"
              class="rounded border-gray-300"
              :checked="selectedUsers.length === filteredUsers.length && filteredUsers.length > 0"
              @change="selectedUsers = selectedUsers.length === filteredUsers.length ? [] : [...filteredUsers]"
            />
          </div>
          <div class="col-span-4">Usuario</div>
          <div class="col-span-2">Rol</div>
          <div class="col-span-2 hidden lg:block">Categoría</div>
          <div class="col-span-2 hidden lg:block">Comercio</div>
          <div class="col-span-1">Estado</div>
        </div>

        <div class="divide-y divide-gray-100">
          <div
            v-for="u in filteredUsers"
            :key="u.id"
            class="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors group cursor-pointer"
            @click="openEdit(u)"
          >
            <!-- Checkbox -->
            <div class="col-span-1" @click.stop>
              <input
                type="checkbox"
                class="rounded border-gray-300"
                :checked="selectedUsers.some(s => s.id === u.id)"
                @change="toggleSelect(u)"
              />
            </div>

            <!-- Usuario -->
            <div class="col-span-4 flex items-center gap-3 min-w-0">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                :class="ROLE_AVATAR_COLORS[u.role]"
              >{{ u.firstName[0] }}{{ u.lastName[0] }}</div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ u.firstName }} {{ u.lastName }}</p>
                <p class="text-xs text-gray-400 truncate">{{ u.email }}</p>
              </div>
            </div>

            <!-- Rol -->
            <div class="col-span-2">
              <span class="badge" :class="ROLE_BADGE_CLASSES[u.role]">{{ ROLE_LABELS[u.role] }}</span>
            </div>

            <!-- Categoría -->
            <div class="col-span-2 hidden lg:block">
              <template v-if="u.category">
                <div class="flex items-center gap-1.5">
                  <span class="text-sm leading-none">{{ u.category.icon }}</span>
                  <span class="text-xs font-medium text-gray-700">{{ u.category.name }}</span>
                </div>
                <div v-if="u.subcategory" class="text-xs text-gray-400 mt-0.5">{{ u.subcategory.name }}</div>
              </template>
              <span v-else class="text-xs text-gray-400">—</span>
            </div>

            <!-- Comercio -->
            <div class="col-span-2 hidden lg:block text-xs text-gray-500 truncate">
              {{ u.restaurant?.name ?? '—' }}
            </div>

            <!-- Estado -->
            <div class="col-span-1" @click.stop>
              <button
                class="badge transition-colors"
                :class="u.isActive
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                :disabled="!canManage(u)"
                @click="toggleStatus(u)"
              >
                <span class="w-1.5 h-1.5 rounded-full mr-1" :class="u.isActive ? 'bg-green-500' : 'bg-gray-400'" />
                {{ u.isActive ? 'Activo' : 'Inactivo' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <div v-if="total > limit" class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p class="text-sm text-gray-500">{{ total }} usuarios en total</p>
          <div class="flex gap-2">
            <button class="btn-secondary text-sm px-3 py-1" :disabled="page <= 1" @click="page--; load()">Anterior</button>
            <span class="text-sm text-gray-600 px-2 py-1">{{ page }} / {{ totalPages }}</span>
            <button class="btn-secondary text-sm px-3 py-1" :disabled="page >= totalPages" @click="page++; load()">Siguiente</button>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal crear/editar -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 class="text-base font-bold text-gray-900">{{ editing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
                <p class="text-xs text-gray-400 mt-0.5">{{ editing ? 'Modifica los datos del usuario' : 'Completa los datos para crear la cuenta' }}</p>
              </div>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" @click="showModal = false">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <form id="user-form" @submit.prevent="save" class="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                  <input v-model="form.firstName" required type="text" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Apellido <span class="text-red-500">*</span></label>
                  <input v-model="form.lastName" required type="text" class="input-field" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Correo electrónico <span class="text-red-500">*</span></label>
                <input v-model="form.email" required type="email" class="input-field" />
              </div>
              <div v-if="!editing">
                <label class="block text-xs font-medium text-gray-700 mb-1">Contraseña <span class="text-red-500">*</span></label>
                <input v-model="form.password" required type="password" minlength="8" placeholder="Mínimo 8 caracteres" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono <span class="text-gray-300">(opcional)</span></label>
                <input v-model="form.phone" type="tel" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Rol <span class="text-red-500">*</span></label>
                <select v-model="form.role" required class="input-field">
                  <option v-for="r in creatableRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </div>
              <div v-if="(form.role === 'COMMERCE' || form.role === 'FREELANCER') && !editing">
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  {{ form.role === 'FREELANCER' ? 'Nombre del negocio' : 'Nombre del comercio' }}
                  <span class="text-gray-300">(opcional)</span>
                </label>
                <input v-model="form.commerceName" type="text" placeholder="Se puede configurar después" class="input-field" />
              </div>
              <div class="p-4 bg-gray-50 rounded-xl space-y-3">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clasificación del perfil</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                    <select v-model="form.categoryId" class="input-field" @change="form.subcategoryId = ''">
                      <option value="">Sin categoría</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.icon ? cat.icon + ' ' : '' }}{{ cat.name }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Subcategoría</label>
                    <select v-model="form.subcategoryId" :disabled="!form.categoryId" class="input-field disabled:opacity-50 disabled:cursor-not-allowed">
                      <option value="">Sin subcategoría</option>
                      <option v-for="sub in availableSubcategories" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
                    </select>
                  </div>
                </div>
              </div>
              <div v-if="formError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-center gap-2">
                <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0" />{{ formError }}
              </div>
            </form>

            <div class="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button type="button" class="btn-secondary flex-1" @click="showModal = false">Cancelar</button>
              <button type="submit" form="user-form" :disabled="saving" class="btn-primary flex-1">
                {{ saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear usuario') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal eliminar -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40" @click="deleteTarget = null; bulkDeleteTargets = []" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-2">
              {{ bulkDeleteTargets.length > 1 ? `¿Eliminar ${bulkDeleteTargets.length} usuarios?` : '¿Eliminar usuario?' }}
            </h3>
            <p class="text-sm text-gray-500 mb-6">
              <template v-if="bulkDeleteTargets.length > 1">
                Se eliminarán permanentemente <strong>{{ bulkDeleteTargets.length }} cuentas</strong>.
              </template>
              <template v-else>
                Se eliminará permanentemente a <strong>{{ deleteTarget.firstName }} {{ deleteTarget.lastName }}</strong>.
              </template>
              Esta acción no se puede deshacer.
            </p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="deleteTarget = null; bulkDeleteTargets = []">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
                :disabled="saving" @click="doDelete">
                {{ saving ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal categorías -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <ModalsCategoryModulesModal
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
import {
  UsersIcon, PlusIcon, XMarkIcon,
  MagnifyingGlassIcon, PencilIcon, TrashIcon,
  Squares2X2Icon, ExclamationCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'

definePageMeta({ middleware: 'auth' })

const { invalidate: invalidateModules } = useModules()

type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

interface UserSubcategory { id: string; name: string }
interface UserCategory    { id: string; name: string; icon?: string; allowedModules: string[]; subcategories: UserSubcategory[] }
interface UserItem {
  id: string; firstName: string; lastName: string; email: string; phone?: string
  role: Role; isActive: boolean; createdAt: string
  restaurant?: { id: string; name: string }
  category?:    { id: string; name: string; icon?: string } | null
  subcategory?: { id: string; name: string } | null
}

const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'SuperAdmin', ADMIN: 'Admin', COMMERCE: 'Comercio', FREELANCER: 'Freelancer', NORMAL: 'Normal',
}
const ROLE_BADGE_CLASSES: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-800', ADMIN: 'bg-blue-100 text-blue-800',
  COMMERCE: 'bg-green-100 text-green-800', FREELANCER: 'bg-yellow-100 text-yellow-800', NORMAL: 'bg-gray-100 text-gray-600',
}
const ROLE_AVATAR_COLORS: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-600', ADMIN: 'bg-blue-600', COMMERCE: 'bg-green-600', FREELANCER: 'bg-yellow-500', NORMAL: 'bg-gray-500',
}

const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPERADMIN')

const availableRoles = computed<{ value: Role; label: string }[]>(() =>
  isSuperAdmin.value
    ? [
        { value: 'SUPERADMIN', label: 'SuperAdmin' }, { value: 'ADMIN', label: 'Admin' },
        { value: 'COMMERCE', label: 'Comercio' }, { value: 'FREELANCER', label: 'Freelancer' }, { value: 'NORMAL', label: 'Normal' },
      ]
    : [{ value: 'COMMERCE', label: 'Comercio' }, { value: 'FREELANCER', label: 'Freelancer' }, { value: 'NORMAL', label: 'Normal' }]
)
const creatableRoles = availableRoles

function canManage(u: UserItem): boolean {
  if (u.id === user.value?.id) return false
  if (isSuperAdmin.value) return true
  return !['SUPERADMIN', 'ADMIN'].includes(u.role)
}

// ─── Estado ───────────────────────────────────────────────────────────────────
const users            = ref<UserItem[]>([])
const categories       = ref<UserCategory[]>([])
const loading          = ref(false)
const error            = ref<string | null>(null)
const total            = ref(0)
const page             = ref(1)
const limit            = 20
const roleFilter       = ref('')
const categoryFilter   = ref('')
const subcategoryFilter = ref('')
const search           = ref('')
const selectedUsers    = ref<UserItem[]>([])
let searchTimer: ReturnType<typeof setTimeout>

const showModal         = ref(false)
const showCategoryModal = ref(false)
const editing           = ref<UserItem | null>(null)
const saving            = ref(false)
const formError         = ref<string | null>(null)
const deleteTarget      = ref<UserItem | null>(null)
const bulkDeleteTargets = ref<UserItem[]>([])

const form = ref({
  firstName: '', lastName: '', email: '', password: '', phone: '',
  role: 'COMMERCE' as Role, commerceName: '', categoryId: '', subcategoryId: '',
})

// ─── Computados ───────────────────────────────────────────────────────────────
const totalPages = computed(() => Math.ceil(total.value / limit))

const filteredUsers = computed(() =>
  search.value.trim()
    ? users.value.filter(u =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.value.toLowerCase())
      )
    : users.value
)

const availableSubcategories = computed<UserSubcategory[]>(() =>
  form.value.categoryId ? (categories.value.find(c => c.id === form.value.categoryId)?.subcategories ?? []) : []
)
const filterSubcategories = computed<UserSubcategory[]>(() =>
  categoryFilter.value ? (categories.value.find(c => c.id === categoryFilter.value)?.subcategories ?? []) : []
)

const headerStats = computed(() => [
  { label: 'Total',       value: String(total.value) },
  { label: 'Commerce',    value: String(users.value.filter(u => u.role === 'COMMERCE').length) },
  { label: 'Freelancer',  value: String(users.value.filter(u => u.role === 'FREELANCER').length) },
  { label: 'Activos',     value: String(users.value.filter(u => u.isActive).length) },
])

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toggleSelect(u: UserItem) {
  const idx = selectedUsers.value.findIndex(s => s.id === u.id)
  if (idx >= 0) selectedUsers.value.splice(idx, 1)
  else selectedUsers.value.push(u)
}

function openEditSelected() {
  if (selectedUsers.value.length === 1) openEdit(selectedUsers.value[0])
}

function confirmDeleteSelected() {
  if (selectedUsers.value.length === 1) {
    confirmDelete(selectedUsers.value[0])
  } else if (selectedUsers.value.length > 1) {
    deleteTarget.value = selectedUsers.value[0]
    bulkDeleteTargets.value = [...selectedUsers.value]
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────
const { apiFetch, get, put, post, patch, del } = useApi()

async function loadCategories() {
  try { categories.value = await get<UserCategory[]>('/users/categories') } catch { }
}

async function load() {
  loading.value = true; error.value = null
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit) })
    if (roleFilter.value)        params.set('role', roleFilter.value)
    if (categoryFilter.value)    params.set('categoryId', categoryFilter.value)
    if (subcategoryFilter.value) params.set('subcategoryId', subcategoryFilter.value)
    const res = await apiFetch<{ data: UserItem[]; total: number }>(`/users?${params}`)
    users.value = res.data; total.value = res.total
  } catch (e: any) { error.value = e?.data?.message ?? e.message }
  finally { loading.value = false }
}

function resetFilters() {
  search.value = ''; roleFilter.value = ''; categoryFilter.value = ''; subcategoryFilter.value = ''
  page.value = 1; load()
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
}

function openCreate() {
  editing.value = null
  form.value = { firstName: '', lastName: '', email: '', password: '', phone: '', role: 'COMMERCE', commerceName: '', categoryId: '', subcategoryId: '' }
  formError.value = null; showModal.value = true
}

function openEdit(u: UserItem) {
  editing.value = u
  form.value = { firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', phone: u.phone ?? '', role: u.role, commerceName: '', categoryId: u.category?.id ?? '', subcategoryId: u.subcategory?.id ?? '' }
  formError.value = null; showModal.value = true
}

async function save() {
  saving.value = true; formError.value = null
  try {
    if (editing.value) {
      await put(`/users/${editing.value.id}`, {
        firstName: form.value.firstName, lastName: form.value.lastName, email: form.value.email,
        phone: form.value.phone || undefined, role: form.value.role,
        categoryId: form.value.categoryId || null, subcategoryId: form.value.subcategoryId || null,
      })
    } else {
      await post('/users', {
        firstName: form.value.firstName, lastName: form.value.lastName, email: form.value.email,
        password: form.value.password, phone: form.value.phone || undefined, role: form.value.role,
        commerceName: form.value.commerceName || undefined,
        categoryId: form.value.categoryId || undefined, subcategoryId: form.value.subcategoryId || undefined,
      })
    }
    showModal.value = false; selectedUsers.value = []
    invalidateModules(); await load()
  } catch (e: any) { formError.value = e?.data?.message ?? e.message }
  finally { saving.value = false }
}

async function toggleStatus(u: UserItem) {
  try { await patch(`/users/${u.id}/toggle-status`); u.isActive = !u.isActive }
  catch (e: any) { error.value = e?.data?.message ?? e.message }
}

function confirmDelete(u: UserItem) { deleteTarget.value = u }

async function doDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    const targets = bulkDeleteTargets.value.length > 0 ? bulkDeleteTargets.value : [deleteTarget.value]
    await Promise.all(targets.map(u => del(`/users/${u.id}`)))
    deleteTarget.value = null; bulkDeleteTargets.value = []; selectedUsers.value = []
    await load()
  } catch (e: any) {
    error.value = e?.data?.message ?? e.message
    deleteTarget.value = null; bulkDeleteTargets.value = []
  } finally { saving.value = false }
}

onMounted(() => { load(); loadCategories() })
</script>
