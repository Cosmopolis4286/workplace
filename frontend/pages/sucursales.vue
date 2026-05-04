<template>
  <div>
    <PageHeader
      title="Gestión de Sucursales"
      description="Negocios y sucursales del mismo propietario"
      :icon="BuildingOfficeIcon"
      :breadcrumb="[{ label: 'Sucursales' }]"
      :stats="headerStats"
    >
      <template #actions>
        <button class="btn-primary flex items-center gap-2" @click="openModal()">
          <PlusIcon class="h-5 w-5" />
          Nueva Sucursal
        </button>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- Plan usage banner -->
    <PlanUsageBanner :usage="usage" :show="['branches']" />

    <!-- Filtros -->
    <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input v-model="searchQuery" type="text" placeholder="Buscar por nombre o dirección..." class="input-field pl-9" />
      </div>
      <select v-model="filterStatus" class="input-field w-auto">
        <option value="">Todos los estados</option>
        <option v-for="(label, status) in BRANCH_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
      </select>
      <button v-if="searchQuery || filterStatus" class="text-sm text-gray-400 hover:text-gray-600" @click="searchQuery = ''; filterStatus = ''">Limpiar</button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="card p-5 animate-pulse space-y-3">
        <div class="skeleton h-5 w-32 rounded" /><div class="skeleton h-4 w-48 rounded" /><div class="skeleton h-4 w-36 rounded" />
      </div>
    </div>

    <!-- Vacío -->
    <div v-else-if="filteredBranches.length === 0" class="card p-12 text-center">
      <BuildingOfficeIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay sucursales registradas</p>
      <p class="text-sm text-gray-400 mt-1">Agrega tu primera sucursal o negocio</p>
      <button class="btn-primary mt-4" @click="openModal()">
        <PlusIcon class="h-4 w-4 inline mr-1.5" />Agregar sucursal
      </button>
    </div>

    <!-- Grid de cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="branch in filteredBranches" :key="branch.id"
        class="card overflow-hidden hover:shadow-md transition-shadow"
      >
        <!-- Barra de color -->
        <div class="h-1.5" :style="{ backgroundColor: branch.color }" />

        <div class="p-5">
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" :style="{ backgroundColor: branch.color }">
                {{ branch.name[0].toUpperCase() }}
              </div>
              <div class="min-w-0">
                <h3 class="font-bold text-gray-900 text-sm truncate">{{ branch.name }}</h3>
                <p v-if="branch.type" class="text-xs text-gray-400">{{ branch.type }}</p>
              </div>
            </div>
            <span class="badge flex-shrink-0" :class="BRANCH_STATUS_CLASSES[branch.status]">{{ BRANCH_STATUS_LABELS[branch.status] }}</span>
          </div>

          <!-- Detalles -->
          <div class="space-y-1.5 text-xs text-gray-500 mb-4">
            <div v-if="branch.address" class="flex items-start gap-1.5">
              <MapPinIcon class="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
              <span class="line-clamp-1">{{ branch.address }}</span>
            </div>
            <div v-if="branch.phone" class="flex items-center gap-1.5">
              <PhoneIcon class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <span>{{ branch.phone }}</span>
            </div>
            <div v-if="branch.managerName" class="flex items-center gap-1.5">
              <UserIcon class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <span>{{ branch.managerName }}</span>
            </div>
          </div>

          <!-- Pie: selector de estado + acciones -->
          <div class="flex items-center justify-between border-t border-gray-100 pt-3">
            <select
              :value="branch.status"
              class="input-field text-xs py-1 w-auto"
              @change="changeStatus(branch.id, ($event.target as HTMLSelectElement).value as BranchStatus)"
            >
              <option v-for="(label, status) in BRANCH_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
            </select>
            <div class="flex gap-1">
              <button class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" @click="openModal(branch)">
                <PencilIcon class="h-4 w-4" />
              </button>
              <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" @click="confirmDelete(branch)">
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal crear/editar -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeModal">
          <div class="absolute inset-0 bg-black/40" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-base font-bold text-gray-900">{{ editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal' }}</h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="closeModal"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <form @submit.prevent="saveBranch" class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label><input v-model="form.name" type="text" required class="input-field" /></div>
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Tipo</label><input v-model="form.type" type="text" placeholder="Sucursal, Franquicia..." class="input-field" /></div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <select v-model="form.status" class="input-field">
                  <option v-for="(label, status) in BRANCH_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
                </select>
              </div>
              <div><label class="block text-xs font-medium text-gray-700 mb-1">Dirección</label><input v-model="form.address" type="text" class="input-field" /></div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label><input v-model="form.phone" type="tel" class="input-field" /></div>
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Email</label><input v-model="form.email" type="email" class="input-field" /></div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Encargado</label><input v-model="form.managerName" type="text" class="input-field" /></div>
                <div><label class="block text-xs font-medium text-gray-700 mb-1">Tel. encargado</label><input v-model="form.managerPhone" type="tel" class="input-field" /></div>
              </div>
              <!-- Selector de color -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-2">Color identificador</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="color in BRANCH_COLORS" :key="color"
                    type="button"
                    class="w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110"
                    :style="{ backgroundColor: color }"
                    :class="form.color === color ? 'border-gray-800 scale-110' : 'border-transparent'"
                    @click="form.color = color"
                  />
                </div>
              </div>
              <div><label class="block text-xs font-medium text-gray-700 mb-1">Notas</label><textarea v-model="form.notes" rows="2" class="input-field resize-none" /></div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : (editingBranch ? 'Guardar cambios' : 'Crear sucursal') }}</button>
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
            <h3 class="text-base font-semibold text-gray-900 mb-2">Eliminar sucursal</h3>
            <p class="text-sm text-gray-500 mb-5">¿Eliminar la sucursal <strong>{{ deletingBranch?.name }}</strong>? Esta acción no se puede deshacer.</p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showDeleteModal = false">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors" :disabled="saving" @click="deleteBranch">
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
import { ref, computed, onMounted } from 'vue'
import { BuildingOfficeIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, MapPinIcon, PhoneIcon, UserIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useSucursales, BRANCH_STATUS_LABELS, BRANCH_STATUS_CLASSES, BRANCH_COLORS, type Branch, type BranchStatus } from '~/composables/useSucursales'
import { usePlans } from '~/composables/usePlans'
import PlanUsageBanner from '~/components/PlanUsageBanner.vue'

definePageMeta({ middleware: 'auth' })

const { branches, stats, loading, error, inConstructionCount, loadSucursales, createSucursal, updateSucursal, deleteSucursal, updateStatus } = useSucursales()

// ─── Filtros ──────────────────────────────────────────────────────────────────
const searchQuery  = ref('')
const filterStatus = ref('')

const filteredBranches = computed(() => {
  let list = branches.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(b => b.name.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q))
  }
  if (filterStatus.value) list = list.filter(b => b.status === filterStatus.value)
  return list
})

const headerStats = computed(() => [
  { label: 'Total',           value: String(stats.value.total)  },
  { label: 'Activas',         value: String(stats.value.active) },
  { label: 'En construcción', value: String(inConstructionCount.value) },
  { label: 'Inactivas',       value: String(branches.value.filter(b => b.status === 'INACTIVA' || b.status === 'CERRADA').length) },
])

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal     = ref(false)
const editingBranch = ref<Branch | null>(null)
const saving        = ref(false)

const emptyForm = () => ({ name: '', address: '', phone: '', email: '', type: '', managerName: '', managerPhone: '', status: 'ACTIVA' as BranchStatus, color: BRANCH_COLORS[5], notes: '' })
const form = ref(emptyForm())

function openModal(branch?: Branch) {
  editingBranch.value = branch ?? null
  form.value = branch
    ? { name: branch.name, address: branch.address ?? '', phone: branch.phone ?? '', email: branch.email ?? '', type: branch.type ?? '', managerName: branch.managerName ?? '', managerPhone: branch.managerPhone ?? '', status: branch.status, color: branch.color, notes: branch.notes ?? '' }
    : emptyForm()
  showModal.value = true
}

function closeModal() { showModal.value = false; editingBranch.value = null }

async function saveBranch() {
  saving.value = true
  const payload = { name: form.value.name, address: form.value.address || undefined, phone: form.value.phone || undefined, email: form.value.email || undefined, type: form.value.type || undefined, managerName: form.value.managerName || undefined, managerPhone: form.value.managerPhone || undefined, status: form.value.status, color: form.value.color, notes: form.value.notes || undefined }
  const ok = editingBranch.value ? await updateSucursal(editingBranch.value.id, payload) : await createSucursal(payload)
  saving.value = false
  if (ok) closeModal()
}

async function changeStatus(id: string, status: BranchStatus) { await updateStatus(id, status) }

// ─── Delete ───────────────────────────────────────────────────────────────────
const showDeleteModal = ref(false)
const deletingBranch  = ref<Branch | null>(null)

function confirmDelete(branch: Branch) { deletingBranch.value = branch; showDeleteModal.value = true }

async function deleteBranch() {
  if (!deletingBranch.value) return; saving.value = true
  const ok = await deleteSucursal(deletingBranch.value.id)
  saving.value = false
  if (ok) showDeleteModal.value = false
}

const { usage, fetchUsage } = usePlans()
onMounted(() => { loadSucursales(); fetchUsage() })
</script>
