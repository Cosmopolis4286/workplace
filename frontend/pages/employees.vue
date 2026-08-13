<template>
  <div>
    <PageHeader
      title="Gestión de Empleados"
      description="Equipo de trabajo del negocio"
      :icon="UsersIcon"
      :breadcrumb="[{ label: 'Empleados' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openModal()">
          Nuevo Empleado
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- Plan usage banner -->
    <PlanUsageBanner :usage="usage" :show="['employees']" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ── Lista principal ─────────────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Filtros -->
        <div class="card p-4 flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input v-model="searchQuery" type="text" placeholder="Buscar por nombre, email o teléfono..." class="input-field pl-9" />
          </div>
          <select v-model="filterRole" class="input-field w-auto">
            <option value="">Todos los roles</option>
            <option v-for="(label, role) in EMPLOYEE_ROLE_LABELS" :key="role" :value="role">{{ label }}</option>
          </select>
          <select v-model="filterStatus" class="input-field w-auto">
            <option value="">Todos los estados</option>
            <option v-for="(label, status) in EMPLOYEE_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
          </select>
        </div>

        <!-- Tabla -->
        <div class="card overflow-hidden">
          <!-- Skeleton -->
          <template v-if="loading">
            <div v-for="i in 5" :key="i" class="p-4 flex items-center gap-4 border-b border-gray-100">
              <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2"><div class="skeleton h-4 w-36 rounded" /><div class="skeleton h-3 w-24 rounded" /></div>
              <div class="skeleton h-6 w-20 rounded-full" />
            </div>
          </template>

          <!-- Vacío -->
          <div v-else-if="filteredEmployees.length === 0" class="p-12 text-center">
            <UsersIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500 font-medium">No hay empleados registrados</p>
            <button class="btn-primary mt-4" @click="openModal()">
              <PlusIcon class="h-4 w-4 inline mr-1.5" />Agregar empleado
            </button>
          </div>

          <!-- Filas -->
          <template v-else>
            <div class="divide-y divide-gray-100">
              <div
                v-for="emp in paginatedEmployees" :key="emp.id"
                class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
              >
                <!-- Avatar -->
                <div
                  class="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  :class="emp.isActive ? 'bg-red-600' : 'bg-gray-300'"
                >{{ emp.firstName[0] }}{{ emp.lastName[0] }}</div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-sm font-semibold text-gray-900">{{ emp.firstName }} {{ emp.lastName }}</p>
                    <span class="badge" :class="EMPLOYEE_ROLE_CLASSES[emp.role]">{{ EMPLOYEE_ROLE_LABELS[emp.role] }}</span>
                    <span v-if="!emp.isActive" class="badge bg-red-100 text-red-600">Deshabilitado</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
                    <span v-if="emp.email">{{ emp.email }}</span>
                    <span v-if="emp.phone">{{ emp.phone }}</span>
                    <span v-if="emp.hireDate">Ingreso: {{ formatDate(emp.hireDate) }}</span>
                  </p>
                </div>

                <!-- Estado -->
                <span class="badge flex-shrink-0" :class="EMPLOYEE_STATUS_CLASSES[emp.status]">
                  {{ EMPLOYEE_STATUS_LABELS[emp.status] }}
                </span>

                <!-- Acciones hover -->
                <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    class="p-1.5 rounded-lg transition-colors"
                    :class="emp.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'"
                    :title="emp.isActive ? 'Deshabilitar' : 'Habilitar'"
                    @click="toggleStatus(emp.id)"
                  >
                    <CheckCircleIcon class="h-4 w-4" />
                  </button>
                  <button class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" @click="openModal(emp)">
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" @click="confirmDelete(emp)">
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Paginación -->
            <div v-if="totalPages > 1" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p class="text-sm text-gray-500">{{ (currentPage-1)*pageSize+1 }}–{{ Math.min(currentPage*pageSize, filteredEmployees.length) }} de {{ filteredEmployees.length }}</p>
              <div class="flex gap-2">
                <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage === 1" @click="currentPage--">Anterior</button>
                <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage === totalPages" @click="currentPage++">Siguiente</button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
      <div class="space-y-4">
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Resumen del equipo</h3>
          <div class="space-y-3">
            <div v-for="s in teamSummary" :key="s.label" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
                <span class="text-sm text-gray-600">{{ s.label }}</span>
              </div>
              <span class="text-sm font-bold text-gray-900">{{ s.count }}</span>
            </div>
          </div>
        </div>

        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Por rol</h3>
          <div class="space-y-2">
            <div v-for="(label, role) in EMPLOYEE_ROLE_LABELS" :key="role" class="flex items-center justify-between">
              <span class="text-xs text-gray-500">{{ label }}</span>
              <span class="text-xs font-bold text-gray-900">{{ employees.filter(e => e.role === role).length }}</span>
            </div>
          </div>
        </div>

        <div v-if="absentCount > 0" class="card p-5 border-l-4 border-l-yellow-400">
          <div class="flex items-center gap-2 mb-1">
            <CalendarIcon class="h-4 w-4 text-yellow-500" />
            <p class="text-sm font-semibold text-gray-700">Ausentes</p>
          </div>
          <p class="text-2xl font-black text-yellow-600">{{ absentCount }}</p>
          <p class="text-xs text-gray-400 mt-1">Vacaciones o licencia</p>
        </div>
      </div>
    </div>

    <!-- Modal crear/editar -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeModal">
          <div class="absolute inset-0 bg-black/40" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-base font-bold text-gray-900">{{ editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado' }}</h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="closeModal"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <form @submit.prevent="saveEmployee" class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label><input v-model="form.firstName" type="text" required class="input-field" /></div>
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Apellido <span class="text-red-500">*</span></label><input v-model="form.lastName" type="text" required class="input-field" /></div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Rol</label>
                  <select v-model="form.role" class="input-field">
                    <option v-for="(label, role) in EMPLOYEE_ROLE_LABELS" :key="role" :value="role">{{ label }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                  <select v-model="form.status" class="input-field">
                    <option v-for="(label, status) in EMPLOYEE_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Email</label><input v-model="form.email" type="email" class="input-field" /></div>
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label><input v-model="form.phone" type="tel" class="input-field" /></div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Salario</label><input v-model.number="form.salary" type="number" min="0" step="0.01" class="input-field" /></div>
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Fecha de ingreso</label><input v-model="form.hireDateInput" type="date" class="input-field" /></div>
              </div>
              <div><label class="block text-xs font-medium text-gray-700 mb-1">Dirección</label><input v-model="form.address" type="text" class="input-field" /></div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Contacto emergencia</label><input v-model="form.emergencyContact" type="text" class="input-field" /></div>
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Tel. emergencia</label><input v-model="form.emergencyPhone" type="tel" class="input-field" /></div>
              </div>
              <div><label class="block text-xs font-medium text-gray-700 mb-1">Notas</label><textarea v-model="form.notes" rows="2" class="input-field resize-none" /></div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : (editingEmployee ? 'Guardar cambios' : 'Crear empleado') }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal eliminar -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showDeleteModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showDeleteModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-2">Eliminar empleado</h3>
            <p class="text-sm text-gray-500 mb-5">¿Eliminar a <strong>{{ deletingEmployee?.firstName }} {{ deletingEmployee?.lastName }}</strong>? Esta acción no se puede deshacer.</p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showDeleteModal = false">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors" :disabled="saving" @click="deleteEmployee">
                {{ saving ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { UsersIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, CheckCircleIcon, CalendarIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import { useEmployees, EMPLOYEE_ROLE_LABELS, EMPLOYEE_ROLE_CLASSES, EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_CLASSES, type Employee, type EmployeeRole, type EmployeeStatus } from '~/composables/users/useEmployees'
import { usePlans } from '~/composables/commerce/usePlans'
import PlanUsageBanner from '~/components/plans/PlanUsageBanner.vue'

definePageMeta({ middleware: 'auth' })

const { employees, stats, loading, error, managerCount, loadEmpleados, fetchEmployee, createEmpleado, updateEmpleado, deleteEmpleado, toggleStatus } = useEmployees()

// ─── Filtros ──────────────────────────────────────────────────────────────────
const searchQuery  = ref('')
const filterRole   = ref('')
const filterStatus = ref('')
const currentPage  = ref(1)
const pageSize     = 10

const filteredEmployees = computed(() => {
  let list = employees.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.phone?.includes(q))
  }
  if (filterRole.value)   list = list.filter(e => e.role === filterRole.value)
  if (filterStatus.value) list = list.filter(e => e.status === filterStatus.value)
  return list
})

const totalPages        = computed(() => Math.ceil(filteredEmployees.value.length / pageSize))
const paginatedEmployees = computed(() => filteredEmployees.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const absentCount       = computed(() => employees.value.filter(e => e.status === 'ON_VACATION' || e.status === 'ON_LEAVE').length)

watch([searchQuery, filterRole, filterStatus], () => { currentPage.value = 1 })

const headerStats = computed(() => [
  { label: 'Total',     value: String(stats.value.total)  },
  { label: 'Activos',   value: String(stats.value.active) },
  { label: 'Gerentes',  value: String(managerCount.value) },
  { label: 'Ausentes',  value: String(absentCount.value)  },
])

const teamSummary = computed(() => [
  { label: 'Activos',        count: stats.value.active,  dot: 'bg-green-400'  },
  { label: 'Vacaciones',     count: employees.value.filter(e => e.status === 'ON_VACATION').length, dot: 'bg-yellow-400' },
  { label: 'Licencia',       count: employees.value.filter(e => e.status === 'ON_LEAVE').length,   dot: 'bg-blue-400'   },
  { label: 'Suspendidos',    count: employees.value.filter(e => e.status === 'SUSPENDED').length, dot: 'bg-orange-400' },
  { label: 'Inactivos',      count: employees.value.filter(e => e.status === 'INACTIVE').length,   dot: 'bg-gray-400'   },
])

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal       = ref(false)
const editingEmployee = ref<Employee | null>(null)
const saving          = ref(false)

const emptyForm = () => ({ firstName: '', lastName: '', email: '', phone: '', role: 'OTHER' as EmployeeRole, status: 'ACTIVE' as EmployeeStatus, salary: undefined as number | undefined, hireDateInput: '', address: '', emergencyContact: '', emergencyPhone: '', notes: '' })
const form = ref(emptyForm())

async function openModal(emp?: Employee) {
  showModal.value = true
  if (!emp) {
    editingEmployee.value = null
    form.value = emptyForm()
    return
  }
  // El listado no trae salario/dirección/contacto de emergencia/notas — se
  // cargan aparte para no perderlos al guardar (payload undefined != borrar).
  const full = (await fetchEmployee(emp.id)) ?? emp
  editingEmployee.value = full
  form.value = { firstName: full.firstName, lastName: full.lastName, email: full.email ?? '', phone: full.phone ?? '', role: full.role, status: full.status, salary: full.salary, hireDateInput: full.hireDate ? full.hireDate.substring(0, 10) : '', address: full.address ?? '', emergencyContact: full.emergencyContact ?? '', emergencyPhone: full.emergencyPhone ?? '', notes: full.notes ?? '' }
}

function closeModal() { showModal.value = false; editingEmployee.value = null }

async function saveEmployee() {
  saving.value = true
  const payload = { firstName: form.value.firstName, lastName: form.value.lastName, email: form.value.email || undefined, phone: form.value.phone || undefined, role: form.value.role, status: form.value.status, salary: form.value.salary, hireDate: form.value.hireDateInput ? `${form.value.hireDateInput}T00:00:00.000Z` : undefined, address: form.value.address || undefined, emergencyContact: form.value.emergencyContact || undefined, emergencyPhone: form.value.emergencyPhone || undefined, notes: form.value.notes || undefined }
  const ok = editingEmployee.value ? await updateEmpleado(editingEmployee.value.id, payload) : await createEmpleado(payload)
  saving.value = false
  if (ok) closeModal()
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const showDeleteModal  = ref(false)
const deletingEmployee = ref<Employee | null>(null)

function confirmDelete(emp: Employee) { deletingEmployee.value = emp; showDeleteModal.value = true }

async function deleteEmployee() {
  if (!deletingEmployee.value) return; saving.value = true
  const ok = await deleteEmpleado(deletingEmployee.value.id)
  saving.value = false
  if (ok) showDeleteModal.value = false
}

function formatDate(d: string) { return new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) }

const { usage, fetchUsage } = usePlans()
onMounted(() => { loadEmpleados(); fetchUsage() })
</script>
