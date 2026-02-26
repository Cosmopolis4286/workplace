<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-float">
            <Users class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Clientes</h1>
            <p class="text-blue-100">Base de datos de clientes y análisis</p>
          </div>
        </div>
        <button
          @click="openModal()"
          class="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
        >
          <Plus class="w-5 h-5" />
          <span class="font-medium">Nuevo Cliente</span>
        </button>
      </div>
    </div>

    <div class="p-6">
      <!-- Error Banner -->
      <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 text-red-700">
          <AlertCircle class="w-5 h-5 flex-shrink-0" />
          <span class="text-sm">{{ error }}</span>
        </div>
        <button @click="error = null" class="text-red-400 hover:text-red-600">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Total Clientes</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ stats.totalClients }}</span>
              </p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <TrendingUp class="w-4 h-4 mr-1" />
                Base de clientes
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg">
              <Users class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Clientes Activos</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ stats.activeClients }}</span>
              </p>
              <p class="text-blue-500 text-sm flex items-center mt-1">
                <Activity class="w-4 h-4 mr-1" />
                Habilitados
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg">
              <Activity class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Gasto Promedio</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>${{ stats.avgSpent.toFixed(2) }}</span>
              </p>
              <p class="text-purple-500 text-sm flex items-center mt-1">
                <DollarSign class="w-4 h-4 mr-1" />
                Por cliente
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg">
              <DollarSign class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Clientes VIP</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-10 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ vipClients }}</span>
              </p>
              <p class="text-yellow-500 text-sm flex items-center mt-1">
                <Star class="w-4 h-4 mr-1" />
                Segmento VIP
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
              <Star class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
            />
          </div>

          <select v-model="selectedSegment" class="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50">
            <option value="">Todos los segmentos</option>
            <option value="VIP">VIP</option>
            <option value="PREMIUM">Premium</option>
            <option value="REGULAR">Regular</option>
            <option value="NUEVO">Nuevo</option>
          </select>

          <select v-model="selectedStatus" class="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50">
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>

          <button
            @click="openModal()"
            class="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg flex items-center justify-center space-x-2"
          >
            <Plus class="w-5 h-5" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <Users class="w-6 h-6 mr-2 text-blue-500" />
            Lista de Clientes
            <span class="ml-2 text-sm font-normal text-gray-500">({{ filteredClients.length }})</span>
          </h2>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading" class="divide-y divide-gray-100">
          <div v-for="i in 5" :key="i" class="px-6 py-4 flex items-center space-x-4 animate-pulse">
            <div class="w-12 h-12 bg-gray-200 rounded-full" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/4" />
              <div class="h-3 bg-gray-100 rounded w-1/3" />
            </div>
            <div class="h-6 bg-gray-200 rounded-full w-16" />
          </div>
        </div>

        <div v-else-if="filteredClients.length === 0" class="py-16 text-center text-gray-500">
          <Users class="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p class="text-lg font-medium">No hay clientes</p>
          <p class="text-sm mt-1">{{ searchQuery || selectedSegment || selectedStatus ? 'Sin resultados para los filtros aplicados' : 'Agrega tu primer cliente' }}</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedidos</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gastado</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="client in paginatedClients"
                :key="client.id"
                class="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0">
                      {{ client.name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ client.name }}</div>
                      <div class="text-xs text-gray-400">Desde {{ formatDate(client.createdAt) }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ client.email || '—' }}</div>
                  <div class="text-sm text-gray-500">{{ client.phone || '—' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="segmentClass(client.segment)" class="px-3 py-1 rounded-full text-xs font-medium">
                    {{ segmentLabel(client.segment) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ client.totalOrders }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${{ client.totalSpent.toFixed(2) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <button
                    @click="handleToggleStatus(client)"
                    :class="client.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'"
                    class="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150"
                  >
                    {{ client.isActive ? 'Activo' : 'Inactivo' }}
                  </button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    @click="openModal(client)"
                    class="text-indigo-600 hover:text-indigo-900 hover:scale-110 transition-all duration-200"
                    title="Editar"
                  >
                    <Edit class="w-5 h-5" />
                  </button>
                  <button
                    @click="confirmDelete(client)"
                    class="text-red-600 hover:text-red-900 hover:scale-110 transition-all duration-200"
                    title="Eliminar"
                  >
                    <Trash2 class="w-5 h-5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="!loading && filteredClients.length > 0" class="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div class="text-sm text-gray-700">
            Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredClients.length) }} de {{ filteredClients.length }}
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="px-3 py-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>
            <span class="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium">
              {{ currentPage }}
            </span>
            <button
              @click="currentPage++"
              :disabled="currentPage >= totalPages"
              class="px-3 py-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="closeModal"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-t-2xl flex items-center justify-between">
            <h3 class="text-xl font-bold text-white">
              {{ editingClient ? 'Editar Cliente' : 'Nuevo Cliente' }}
            </h3>
            <button @click="closeModal" class="text-white/80 hover:text-white transition-colors">
              <X class="w-6 h-6" />
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                maxlength="100"
                placeholder="Nombre completo"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input
                v-model="form.email"
                type="email"
                maxlength="100"
                placeholder="correo@ejemplo.com"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                v-model="form.phone"
                type="text"
                maxlength="30"
                placeholder="+58 412-1234567"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                v-model="form.address"
                type="text"
                maxlength="200"
                placeholder="Dirección del cliente"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
              <select
                v-model="form.segment"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              >
                <option value="NUEVO">Nuevo</option>
                <option value="REGULAR">Regular</option>
                <option value="PREMIUM">Premium</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                v-model="form.notes"
                maxlength="500"
                rows="3"
                placeholder="Preferencias, observaciones..."
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div v-if="formError" class="flex items-center space-x-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
              <AlertCircle class="w-4 h-4 flex-shrink-0" />
              <span>{{ formError }}</span>
            </div>

            <div class="flex space-x-3 pt-2">
              <button
                type="button"
                @click="closeModal"
                class="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {{ saving ? 'Guardando...' : editingClient ? 'Actualizar' : 'Crear Cliente' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="clientToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @mousedown.self="clientToDelete = null"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div class="text-center">
            <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 class="w-8 h-8 text-red-500" />
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">¿Eliminar cliente?</h3>
            <p class="text-gray-500 mb-6">
              Se eliminará permanentemente a <strong>{{ clientToDelete.name }}</strong>.
              Esta acción no se puede deshacer.
            </p>
            <div class="flex space-x-3">
              <button
                @click="clientToDelete = null"
                class="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                @click="handleDelete"
                :disabled="deleting"
                class="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium disabled:opacity-60"
              >
                {{ deleting ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Users, Search, Plus, Edit, Trash2,
  TrendingUp, Activity, DollarSign, Star,
  ChevronLeft, ChevronRight, X, AlertCircle,
} from 'lucide-vue-next'
import { useClientes, type Customer, type CustomerSegment } from '~/composables/useClientes'

const {
  customers, stats, loading, error,
  vipClients, loadClientes, createCliente, updateCliente, deleteCliente, toggleStatus,
} = useClientes()

// ─── Filters & pagination ──────────────────────────────────────────────────

const searchQuery = ref('')
const selectedSegment = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const itemsPerPage = 10

const filteredClients = computed(() => {
  let list = customers.value

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q),
    )
  }

  if (selectedSegment.value) {
    list = list.filter((c) => c.segment === selectedSegment.value)
  }

  if (selectedStatus.value === 'active') list = list.filter((c) => c.isActive)
  else if (selectedStatus.value === 'inactive') list = list.filter((c) => !c.isActive)

  return list
})

// Reset page when filters change
watch([searchQuery, selectedSegment, selectedStatus], () => { currentPage.value = 1 })

const totalPages = computed(() => Math.ceil(filteredClients.value.length / itemsPerPage))

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredClients.value.slice(start, start + itemsPerPage)
})

// ─── Helpers ───────────────────────────────────────────────────────────────

const segmentLabel = (segment: CustomerSegment) => {
  const labels: Record<CustomerSegment, string> = {
    VIP: 'VIP', PREMIUM: 'Premium', REGULAR: 'Regular', NUEVO: 'Nuevo',
  }
  return labels[segment] ?? segment
}

const segmentClass = (segment: CustomerSegment) => {
  const classes: Record<CustomerSegment, string> = {
    VIP: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800',
    PREMIUM: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800',
    REGULAR: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800',
    NUEVO: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800',
  }
  return classes[segment] ?? 'bg-gray-100 text-gray-800'
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('es-VE', { year: 'numeric', month: 'short' })
}

// ─── Modal ─────────────────────────────────────────────────────────────────

const showModal = ref(false)
const editingClient = ref<Customer | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)

const defaultForm = () => ({ name: '', email: '', phone: '', address: '', notes: '', segment: 'NUEVO' as CustomerSegment })
const form = ref(defaultForm())

function openModal(client?: Customer) {
  editingClient.value = client ?? null
  formError.value = null
  if (client) {
    form.value = {
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
      segment: client.segment,
    }
  } else {
    form.value = defaultForm()
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingClient.value = null
  formError.value = null
}

async function handleSubmit() {
  formError.value = null
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      email: form.value.email?.trim() || undefined,
      phone: form.value.phone?.trim() || undefined,
      address: form.value.address?.trim() || undefined,
      notes: form.value.notes?.trim() || undefined,
      segment: form.value.segment,
    }

    let result: Customer | null
    if (editingClient.value) {
      result = await updateCliente(editingClient.value.id, payload)
    } else {
      result = await createCliente(payload)
    }

    if (result) {
      closeModal()
    } else {
      formError.value = error.value ?? 'Error al guardar'
    }
  } finally {
    saving.value = false
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────

const clientToDelete = ref<Customer | null>(null)
const deleting = ref(false)

function confirmDelete(client: Customer) {
  clientToDelete.value = client
}

async function handleDelete() {
  if (!clientToDelete.value) return
  deleting.value = true
  const ok = await deleteCliente(clientToDelete.value.id)
  deleting.value = false
  if (ok) clientToDelete.value = null
}

// ─── Toggle status ─────────────────────────────────────────────────────────

async function handleToggleStatus(client: Customer) {
  await toggleStatus(client.id)
}

// ─── Init ──────────────────────────────────────────────────────────────────

onMounted(() => loadClientes())
</script>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
