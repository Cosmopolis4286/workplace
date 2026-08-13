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
        <HeaderActionButton :icon="Squares2X2Icon" @click="showCategoryModal = true">
          Categorías
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openCreate">
          Nuevo Usuario
        </HeaderActionButton>
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
    <div v-if="loading" class="card overflow-hidden divide-y divide-gray-100">
      <div v-for="i in 6" :key="i" class="p-4 flex items-center gap-4">
        <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
        <div class="flex-1 space-y-2"><div class="skeleton h-4 w-40 rounded" /><div class="skeleton h-3 w-56 rounded" /></div>
        <div class="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>

    <AppTable
      v-else
      :rows="users"
      selectable
      row-key="id"
      :selected="selectedUsers"
      :total="total"
      :page-size="limit"
      :current-page="page"
      total-label="usuarios en total"
      :slots-colspan="5"
      @update:selected="selectedUsers = $event"
      @page-change="page = $event; load()"
    >
      <template #headers>
        <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
        <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
        <th class="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
        <th class="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Comercio</th>
        <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
      </template>

      <template #row="{ row: u }">
        <td class="px-4 py-3" @click.stop="canManage(u) && openEdit(u)">
          <div class="flex items-center gap-3 min-w-0" :class="canManage(u) ? 'cursor-pointer' : 'cursor-default'">
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              :class="ROLE_AVATAR_COLORS[u.role]"
            >{{ u.firstName[0] }}{{ u.lastName[0] }}</div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ u.firstName }} {{ u.lastName }}</p>
              <p class="text-xs text-gray-400 truncate">{{ u.email }}</p>
            </div>
          </div>
        </td>

        <td class="px-4 py-3">
          <span class="badge" :class="ROLE_BADGE_CLASSES[u.role]">{{ ROLE_LABELS[u.role] }}</span>
        </td>

        <td class="hidden lg:table-cell px-4 py-3">
          <template v-if="u.category">
            <div class="flex items-center gap-1.5">
              <span class="text-sm leading-none">{{ u.category.icon }}</span>
              <span class="text-xs font-medium text-gray-700">{{ u.category.name }}</span>
            </div>
            <div v-if="u.subcategory" class="text-xs text-gray-400 mt-0.5">{{ u.subcategory.name }}</div>
          </template>
          <span v-else class="text-xs text-gray-400">—</span>
        </td>

        <td class="hidden lg:table-cell px-4 py-3 text-xs text-gray-500 truncate">
          {{ u.commerce?.name ?? '—' }}
        </td>

        <td class="px-4 py-3" @click.stop>
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
        </td>
      </template>

      <template #empty>
        <UsersIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">No se encontraron usuarios</p>
      </template>
    </AppTable>

    <UserFormModal
      v-model="showModal"
      :form="form"
      :editing="!!editing"
      :user-id="editing?.id"
      :saving="saving"
      :form-error="formError"
      :categories="categories"
      :creatable-roles="creatableRoles"
      @submit="save"
    />

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
  Squares2X2Icon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import AppTable from '~/components/ui/AppTable.vue'
import UserFormModal from '~/components/modals/UserFormModal.vue'
import { ROLE_LABELS, ROLE_BADGE_CLASSES, ROLE_AVATAR_COLORS, type Role } from '~/config/roles.config'
import { useUsers, emptyUserForm, type UserItem, type UserCategory, type UsersStats } from '~/composables/users/useUsers'
import { useConfirm } from '~/composables/ui/useConfirm'

definePageMeta({ middleware: 'auth' })

const { invalidate: invalidateModules } = useModules()
const { listUsers, getStats, loadCategories: fetchCategories, createUser, updateUser, toggleUserStatus, deleteUser } = useUsers()
const { confirm } = useConfirm()

const { user } = useAuth()
const { isSuperAdmin, canManage } = useRoleHierarchy()

const availableRoles = computed<{ value: Role; label: string }[]>(() =>
  isSuperAdmin.value
    ? [
        { value: 'SUPERADMIN', label: 'SuperAdmin' }, { value: 'ADMIN', label: 'Admin' },
        { value: 'COMMERCE', label: 'Comercio' }, { value: 'FREELANCER', label: 'Freelancer' }, { value: 'NORMAL', label: 'Normal' },
      ]
    : [{ value: 'COMMERCE', label: 'Comercio' }, { value: 'FREELANCER', label: 'Freelancer' }, { value: 'NORMAL', label: 'Normal' }]
)
const creatableRoles = availableRoles

// ─── Estado ───────────────────────────────────────────────────────────────────
const users             = ref<UserItem[]>([])
const categories        = ref<UserCategory[]>([])
const loading           = ref(false)
const error             = ref<string | null>(null)
const total             = ref(0)
const page              = ref(1)
const limit             = 20
const roleFilter        = ref('')
const categoryFilter    = ref('')
const subcategoryFilter = ref('')
const search            = ref('')
const selectedUsers     = ref<UserItem[]>([])
let searchTimer: ReturnType<typeof setTimeout>

const showModal          = ref(false)
const showCategoryModal  = ref(false)
const editing            = ref<UserItem | null>(null)
const saving             = ref(false)
const formError          = ref<string | null>(null)

const form = ref(emptyUserForm())
const stats = ref<UsersStats>({ total: 0, commerce: 0, freelancer: 0, active: 0 })

// ─── Computados ───────────────────────────────────────────────────────────────
const filterSubcategories = computed(() =>
  categoryFilter.value ? (categories.value.find(c => c.id === categoryFilter.value)?.subcategories ?? []) : []
)

// Agregados sobre todo el conjunto filtrado (vía GET /users/stats), no solo
// la página de 20 registros cargada en `users`.
const headerStats = computed(() => [
  { label: 'Total',      value: String(stats.value.total) },
  { label: 'Commerce',   value: String(stats.value.commerce) },
  { label: 'Freelancer', value: String(stats.value.freelancer) },
  { label: 'Activos',    value: String(stats.value.active) },
])

// ─── Helpers ──────────────────────────────────────────────────────────────────
function openEditSelected() {
  if (selectedUsers.value.length === 1) openEdit(selectedUsers.value[0])
}

function confirmDeleteSelected() {
  if (selectedUsers.value.length >= 1) confirmDelete(selectedUsers.value)
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function loadCategories() {
  try { categories.value = await fetchCategories() } catch { }
}

async function load() {
  loading.value = true; error.value = null
  const filters = {
    roleFilter: roleFilter.value, categoryFilter: categoryFilter.value,
    subcategoryFilter: subcategoryFilter.value, search: search.value,
  }
  try {
    const [res, statsRes] = await Promise.all([
      listUsers({ page: page.value, limit, ...filters }),
      getStats(filters),
    ])
    users.value = res.data; total.value = res.total
    stats.value = statsRes
  } catch (e: any) { error.value = e?.message }
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
  form.value = emptyUserForm()
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
      await updateUser(editing.value.id, form.value)
    } else {
      await createUser(form.value)
    }
    showModal.value = false; selectedUsers.value = []
    invalidateModules(); await load()
  } catch (e: any) { formError.value = e?.data?.message ?? e.message }
  finally { saving.value = false }
}

async function toggleStatus(u: UserItem) {
  try { await toggleUserStatus(u.id); u.isActive = !u.isActive }
  catch (e: any) { error.value = e?.data?.message ?? e.message }
}

async function confirmDelete(target: UserItem | UserItem[]) {
  const targets = Array.isArray(target) ? target : [target]
  const isBulk = targets.length > 1

  await confirm({
    title: isBulk ? `¿Eliminar ${targets.length} usuarios?` : '¿Eliminar usuario?',
    message: isBulk
      ? `Se eliminarán permanentemente ${targets.length} cuentas. Esta acción no se puede deshacer.`
      : `Se eliminará permanentemente a ${targets[0].firstName} ${targets[0].lastName}. Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      const results = await Promise.allSettled(targets.map(u => deleteUser(u.id)))
      const failed = results
        .map((r, i) => ({ r, u: targets[i] }))
        .filter(({ r }) => r.status === 'rejected')

      if (failed.length < targets.length) {
        selectedUsers.value = []
        await load()
      }

      if (failed.length > 0) {
        const names = failed.map(({ u }) => `${u.firstName} ${u.lastName}`).join(', ')
        return failed.length === targets.length
          ? 'No se pudo eliminar ningún usuario.'
          : `No se pudieron eliminar: ${names}`
      }
    },
  })
}

onMounted(() => { load(); loadCategories() })
</script>
