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
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openModal()">
          Nuevo Cliente
        </HeaderActionButton>
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
      <div class="lg:col-span-2 space-y-4">
        <CustomersFiltersBar
          :search-query="searchQuery"
          :selected-segment="selectedSegment"
          :selected-status="selectedStatus"
          @update:search-query="searchQuery = $event"
          @update:selected-segment="selectedSegment = $event"
          @update:selected-status="selectedStatus = $event"
          @clear="clearFilters"
        />

        <CustomersTable
          :clients="paginatedClients"
          :filtered-count="filteredClients.length"
          :is-filtered="!!(searchQuery || selectedSegment || selectedStatus)"
          :loading="loading"
          :segment-labels="SEGMENT_LABELS"
          :segment-classes="SEGMENT_CLASSES"
          :format-date="formatDate"
          :toggling-status-id="togglingStatusId"
          :telegram-link-loading="telegramLinkLoading"
          :current-page="currentPage"
          :total-pages="totalPages"
          :items-per-page="itemsPerPage"
          @create="openModal()"
          @edit="openModal"
          @delete="confirmDelete"
          @toggle-status="handleToggleStatus"
          @send-telegram-link="sendTelegramLink"
          @update:current-page="currentPage = $event"
        />
      </div>

      <CustomersSidebar
        :segment-summary="segmentSummary"
        :total-clients="stats.totalClients"
        :loading="loading"
        :top-clients="topClients"
        :active-clients="stats.activeClients"
        :avg-spent="stats.avgSpent"
        :vip-clients="vipClients"
        @select-client="openModal"
      />
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

    <CustomerFormModal
      :show="showModal"
      :editing="!!editingClient"
      :saving="saving"
      :form-error="formError"
      :form="form"
      @close="closeModal"
      @submit="handleSubmit"
    />

    <DeleteCustomerModal
      :client="clientToDelete"
      :deleting="deleting"
      @close="clientToDelete = null"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { UsersIcon, PlusIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import CustomersFiltersBar from '~/components/customers/CustomersFiltersBar.vue'
import CustomersTable from '~/components/customers/CustomersTable.vue'
import CustomersSidebar from '~/components/customers/CustomersSidebar.vue'
import CustomerFormModal, { type CustomerFormData } from '~/components/customers/CustomerFormModal.vue'
import DeleteCustomerModal from '~/components/customers/DeleteCustomerModal.vue'
import { useCustomers, type Customer, type CustomerSegment } from '~/composables/customers/useCustomers'

definePageMeta({ middleware: 'auth' })

const {
  customers, stats, loading, error,
  vipClients, loadClientes, createCliente, updateCliente, deleteCliente, toggleStatus,
} = useCustomers()

// ─── Segmento maps ────────────────────────────────────────────────────────────
const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  VIP: 'VIP', PREMIUM: 'Premium', REGULAR: 'Regular', NEW: 'Nuevo',
}
const SEGMENT_CLASSES: Record<CustomerSegment, string> = {
  VIP:     'bg-purple-100 text-purple-800',
  PREMIUM: 'bg-blue-100 text-blue-800',
  REGULAR: 'bg-green-100 text-green-800',
  NEW:   'bg-yellow-100 text-yellow-800',
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
    { key: 'NEW',   label: 'Nuevo',   emoji: '🆕', count: count('NEW'),   bar: 'bg-yellow-400' },
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
  return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: 'short' })
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal     = ref(false)
const editingClient = ref<Customer | null>(null)
const saving        = ref(false)
const formError     = ref<string | null>(null)

const defaultForm = (): CustomerFormData => ({ name: '', email: '', phone: '', address: '', notes: '', segment: 'NEW' })
const form = ref<CustomerFormData>(defaultForm())

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
const togglingStatusId = ref<string | null>(null)
async function handleToggleStatus(client: Customer) {
  if (togglingStatusId.value) return
  togglingStatusId.value = client.id
  try {
    await toggleStatus(client.id)
  } finally {
    togglingStatusId.value = null
  }
}

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
