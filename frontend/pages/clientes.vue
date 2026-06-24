<template>
  <div>
    <PageHeader
      title="Gestión de Clientes"
      description="Base de datos de clientes y análisis de segmentos"
      :icon="UsersIcon"
      :breadcrumb="[{ label: 'Clientes' }]"
      :stats="headerStats"
    >
      <template #actions>
        <button class="btn-primary flex items-center gap-2" @click="openModal()">
          <PlusIcon class="h-5 w-5" />
          Nuevo Cliente
        </button>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ── Columna principal ────────────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Filtros -->
        <div class="card p-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1">
              <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                class="input-field pl-9"
                @input="currentPage = 1"
              />
            </div>
            <select v-model="selectedSegment" class="input-field w-auto" @change="currentPage = 1">
              <option value="">Todos los segmentos</option>
              <option value="VIP">VIP</option>
              <option value="PREMIUM">Premium</option>
              <option value="REGULAR">Regular</option>
              <option value="NUEVO">Nuevo</option>
            </select>
            <select v-model="selectedStatus" class="input-field w-auto" @change="currentPage = 1">
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <button
              v-if="searchQuery || selectedSegment || selectedStatus"
              class="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap"
              @click="clearFilters"
            >Limpiar</button>
          </div>
        </div>

        <!-- Tabla -->
        <div class="card overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p class="text-sm font-medium text-gray-700">
              {{ filteredClients.length }} cliente{{ filteredClients.length !== 1 ? 's' : '' }}
              <span v-if="searchQuery || selectedSegment || selectedStatus" class="text-gray-400 font-normal"> — filtrados</span>
            </p>
          </div>

          <!-- Skeleton -->
          <template v-if="loading">
            <div v-for="i in 5" :key="i" class="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0">
              <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="skeleton h-4 w-36 rounded" />
                <div class="skeleton h-3 w-48 rounded" />
              </div>
              <div class="skeleton h-6 w-16 rounded-full" />
            </div>
          </template>

          <!-- Empty -->
          <div v-else-if="filteredClients.length === 0" class="p-12 text-center">
            <UsersIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500 font-medium">No hay clientes</p>
            <p class="text-sm text-gray-400 mt-1">
              {{ searchQuery || selectedSegment || selectedStatus ? 'Sin resultados para los filtros aplicados' : 'Agrega tu primer cliente' }}
            </p>
            <button v-if="!searchQuery && !selectedSegment && !selectedStatus" class="btn-primary mt-4" @click="openModal()">
              <PlusIcon class="h-4 w-4 inline mr-1.5" />Nuevo Cliente
            </button>
          </div>

          <!-- Filas -->
          <template v-else>
            <div
              v-for="client in paginatedClients"
              :key="client.id"
              class="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0"
            >
              <!-- Avatar -->
              <div class="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 font-bold text-sm text-red-700">
                {{ client.name.charAt(0).toUpperCase() }}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ client.name }}</p>
                  <span class="badge" :class="SEGMENT_CLASSES[client.segment]">
                    {{ SEGMENT_LABELS[client.segment] }}
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
                  <span v-if="client.email">{{ client.email }}</span>
                  <span v-if="client.phone">{{ client.phone }}</span>
                  <span>Desde {{ formatDate(client.createdAt) }}</span>
                </p>
              </div>

              <!-- Pedidos + gasto -->
              <div class="hidden sm:flex flex-col items-end text-right flex-shrink-0">
                <p class="text-sm font-bold text-gray-900">${{ client.totalSpent.toFixed(2) }}</p>
                <p class="text-xs text-gray-400">{{ client.totalOrders }} pedido{{ client.totalOrders !== 1 ? 's' : '' }}</p>
              </div>

              <!-- Estado -->
              <button
                class="flex-shrink-0 badge transition-colors"
                :class="client.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                @click="handleToggleStatus(client)"
              >
                {{ client.isActive ? 'Activo' : 'Inactivo' }}
              </button>

              <!-- Acciones hover -->
              <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                  @click="openModal(client)"
                >
                  <PencilIcon class="h-4 w-4" />
                </button>
                <button
                  class="p-1.5 rounded-lg transition-colors"
                  :class="client.telegramChatId ? 'text-green-500 hover:text-green-700 hover:bg-green-50' : 'text-sky-500 hover:text-sky-700 hover:bg-sky-50'"
                  :title="client.telegramChatId ? 'Telegram vinculado — copiar nuevo link' : 'Enviar link de Telegram'"
                  :disabled="telegramLinkLoading === client.id"
                  @click="sendTelegramLink(client)"
                >
                  <PaperAirplaneIcon class="h-4 w-4" />
                </button>
                <button
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                  @click="confirmDelete(client)"
                >
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </div>
          </template>

          <!-- Paginación -->
          <div v-if="!loading && totalPages > 1" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p class="text-sm text-gray-500">
              {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredClients.length) }}
              de {{ filteredClients.length }}
            </p>
            <div class="flex gap-2">
              <button
                class="btn-secondary text-sm px-3 py-1"
                :disabled="currentPage === 1"
                @click="currentPage--"
              >Anterior</button>
              <span class="text-sm text-gray-600 px-2 py-1">{{ currentPage }} / {{ totalPages }}</span>
              <button
                class="btn-secondary text-sm px-3 py-1"
                :disabled="currentPage >= totalPages"
                @click="currentPage++"
              >Siguiente</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Distribución por segmento -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Por segmento</h3>
          <div class="space-y-3">
            <div v-for="s in segmentSummary" :key="s.key" class="flex items-center gap-3">
              <span class="text-base flex-shrink-0">{{ s.emoji }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-600">{{ s.label }}</span>
                  <span class="font-bold text-gray-900">{{ s.count }}</span>
                </div>
                <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="s.bar"
                    :style="{ width: stats.totalClients ? `${Math.round((s.count / stats.totalClients) * 100)}%` : '0%' }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top clientes por gasto -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Top clientes</h3>
          <div v-if="loading" class="space-y-3">
            <div v-for="n in 3" :key="n" class="skeleton h-10 w-full rounded-lg" />
          </div>
          <div v-else class="space-y-2.5">
            <div
              v-for="(client, i) in topClients"
              :key="client.id"
              class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
              @click="openModal(client)"
            >
              <span
                class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                :class="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'"
              >{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-900 truncate">{{ client.name }}</p>
                <p class="text-[10px] text-gray-400">{{ client.totalOrders }} pedidos</p>
              </div>
              <span class="text-xs font-bold text-gray-900 flex-shrink-0">${{ client.totalSpent.toFixed(0) }}</span>
            </div>
            <p v-if="topClients.length === 0" class="text-xs text-gray-400 text-center py-2">Sin datos</p>
          </div>
        </div>

        <!-- Resumen rápido -->
        <div class="card p-5 border-l-4 border-l-red-400">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Resumen</h3>
          <div class="space-y-2.5">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Activos</span>
              <span class="font-bold text-green-600">{{ stats.activeClients }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Inactivos</span>
              <span class="font-bold text-gray-400">{{ stats.totalClients - stats.activeClients }}</span>
            </div>
            <div class="h-px bg-gray-100" />
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Gasto promedio</span>
              <span class="font-bold text-gray-900">${{ stats.avgSpent.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Clientes VIP</span>
              <span class="font-bold text-purple-600">{{ vipClients }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Telegram -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="telegramToast"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-sky-600 text-white text-sm font-medium"
        >
          <PaperAirplaneIcon class="h-4 w-4 flex-shrink-0" />
          <span>{{ telegramToast }}</span>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal crear / editar -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @mousedown.self="closeModal">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeModal" />
          <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100"
            leave-active-class="ease-in duration-150" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
            <div v-if="showModal" class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div class="flex items-center justify-between mb-5">
                <h2 class="text-lg font-semibold text-gray-900">
                  {{ editingClient ? 'Editar Cliente' : 'Nuevo Cliente' }}
                </h2>
                <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="closeModal">
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                  <input v-model="form.name" type="text" required maxlength="100" placeholder="Nombre completo" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <input v-model="form.email" type="email" maxlength="100" placeholder="correo@ejemplo.com" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                  <input v-model="form.phone" type="text" maxlength="30" placeholder="+58 412-1234567" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
                  <input v-model="form.address" type="text" maxlength="200" placeholder="Dirección del cliente" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Segmento</label>
                  <select v-model="form.segment" class="input-field">
                    <option value="NUEVO">Nuevo</option>
                    <option value="REGULAR">Regular</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                  <textarea v-model="form.notes" maxlength="500" rows="3" placeholder="Preferencias, observaciones..." class="input-field resize-none" />
                </div>

                <div v-if="formError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {{ formError }}
                </div>

                <div class="flex gap-3 pt-2">
                  <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary flex-1" :disabled="saving">
                    {{ saving ? 'Guardando...' : (editingClient ? 'Actualizar' : 'Crear Cliente') }}
                  </button>
                </div>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal eliminar -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="clientToDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4" @mousedown.self="clientToDelete = null">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="clientToDelete = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Eliminar cliente</h3>
            <p class="text-sm text-gray-600 mb-6">
              ¿Estás seguro de eliminar a <strong>{{ clientToDelete.name }}</strong>? Esta acción no se puede deshacer.
            </p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="clientToDelete = null">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
                :disabled="deleting" @click="handleDelete">
                {{ deleting ? 'Eliminando...' : 'Eliminar' }}
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
import {
  UsersIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useClientes, type Customer, type CustomerSegment } from '~/composables/useClientes'

definePageMeta({ middleware: 'auth' })

const {
  customers, stats, loading, error,
  vipClients, loadClientes, createCliente, updateCliente, deleteCliente, toggleStatus,
} = useClientes()

// ─── Segmento maps ────────────────────────────────────────────────────────────
const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  VIP: 'VIP', PREMIUM: 'Premium', REGULAR: 'Regular', NUEVO: 'Nuevo',
}
const SEGMENT_CLASSES: Record<CustomerSegment, string> = {
  VIP:     'bg-purple-100 text-purple-800',
  PREMIUM: 'bg-blue-100 text-blue-800',
  REGULAR: 'bg-green-100 text-green-800',
  NUEVO:   'bg-yellow-100 text-yellow-800',
}

// ─── Filtros y paginación ─────────────────────────────────────────────────────
const searchQuery    = ref('')
const selectedSegment = ref('')
const selectedStatus  = ref('')
const currentPage     = ref(1)
const itemsPerPage    = 10

const filteredClients = computed(() => {
  let list = customers.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    )
  }
  if (selectedSegment.value) list = list.filter(c => c.segment === selectedSegment.value)
  if (selectedStatus.value === 'active')   list = list.filter(c => c.isActive)
  if (selectedStatus.value === 'inactive') list = list.filter(c => !c.isActive)
  return list
})

watch([searchQuery, selectedSegment, selectedStatus], () => { currentPage.value = 1 })

const totalPages = computed(() => Math.ceil(filteredClients.value.length / itemsPerPage))
const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredClients.value.slice(start, start + itemsPerPage)
})

function clearFilters() {
  searchQuery.value = ''; selectedSegment.value = ''; selectedStatus.value = ''
}

// ─── Computados sidebar ───────────────────────────────────────────────────────
const headerStats = computed(() => [
  { label: 'Total',    value: String(stats.value.totalClients) },
  { label: 'Activos',  value: String(stats.value.activeClients) },
  { label: 'Promedio', value: `$${stats.value.avgSpent.toFixed(0)}` },
  { label: 'VIP',      value: String(vipClients.value) },
])

const segmentSummary = computed(() => {
  const count = (seg: string) => customers.value.filter(c => c.segment === seg).length
  return [
    { key: 'VIP',     label: 'VIP',     emoji: '⭐', count: count('VIP'),     bar: 'bg-purple-400' },
    { key: 'PREMIUM', label: 'Premium', emoji: '💎', count: count('PREMIUM'), bar: 'bg-blue-400'   },
    { key: 'REGULAR', label: 'Regular', emoji: '✅', count: count('REGULAR'), bar: 'bg-green-400'  },
    { key: 'NUEVO',   label: 'Nuevo',   emoji: '🆕', count: count('NUEVO'),   bar: 'bg-yellow-400' },
  ]
})

const topClients = computed(() =>
  [...customers.value]
    .filter(c => c.isActive)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { year: 'numeric', month: 'short' })
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal     = ref(false)
const editingClient = ref<Customer | null>(null)
const saving        = ref(false)
const formError     = ref<string | null>(null)

const defaultForm = () => ({ name: '', email: '', phone: '', address: '', notes: '', segment: 'NUEVO' as CustomerSegment })
const form = ref(defaultForm())

function openModal(client?: Customer) {
  editingClient.value = client ?? null
  formError.value = null
  form.value = client
    ? { name: client.name, email: client.email ?? '', phone: client.phone ?? '', address: client.address ?? '', notes: client.notes ?? '', segment: client.segment }
    : defaultForm()
  showModal.value = true
}

function closeModal() {
  showModal.value = false; editingClient.value = null; formError.value = null
}

async function handleSubmit() {
  formError.value = null; saving.value = true
  try {
    const payload = {
      name:    form.value.name.trim(),
      email:   form.value.email?.trim()   || undefined,
      phone:   form.value.phone?.trim()   || undefined,
      address: form.value.address?.trim() || undefined,
      notes:   form.value.notes?.trim()   || undefined,
      segment: form.value.segment,
    }
    const result = editingClient.value
      ? await updateCliente(editingClient.value.id, payload)
      : await createCliente(payload)
    if (result) closeModal()
    else formError.value = error.value ?? 'Error al guardar'
  } finally { saving.value = false }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────
const clientToDelete = ref<Customer | null>(null)
const deleting       = ref(false)

function confirmDelete(client: Customer) { clientToDelete.value = client }

async function handleDelete() {
  if (!clientToDelete.value) return
  deleting.value = true
  const ok = await deleteCliente(clientToDelete.value.id)
  deleting.value = false
  if (ok) clientToDelete.value = null
}

// ─── Toggle status ────────────────────────────────────────────────────────────
async function handleToggleStatus(client: Customer) { await toggleStatus(client.id) }

// ─── Telegram ─────────────────────────────────────────────────────────────────
const telegramLinkLoading = ref<string | null>(null)
const telegramToast       = ref<string | null>(null)

async function sendTelegramLink(client: Customer) {
  telegramLinkLoading.value = client.id
  try {
    const { get } = useApi()
    const data = await get<{ url?: string; linked?: boolean }>(`/telegram/link/${client.id}`)
    if (data.url) {
      await navigator.clipboard.writeText(data.url)
      telegramToast.value = `¡Link copiado! Envíaselo a ${client.name} por Telegram.`
    } else if (data.linked) {
      telegramToast.value = `${client.name} ya tiene Telegram vinculado ✓`
    } else {
      telegramToast.value = 'No se pudo generar el link. Verifica TELEGRAM_BOT_USERNAME.'
    }
  } catch {
    telegramToast.value = 'Error al generar link de Telegram.'
  } finally {
    telegramLinkLoading.value = null
    setTimeout(() => { telegramToast.value = null }, 4000)
  }
}

onMounted(() => loadClientes())
</script>
