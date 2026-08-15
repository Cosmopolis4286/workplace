<template>
  <div>
    <PageHeader
      title="Agendamientos"
      description="Gestiona las reservas y citas del comercio"
      :icon="CalendarDaysIcon"
      :breadcrumb="[{ label: 'Agendamientos' }]"
      :stats="headerStats"
    >
      <template #actions>
        <!-- Toggle vista -->
        <div class="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
          <button
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
            :class="viewMode === 'list' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="viewMode = 'list'"
          >
            <ListBulletIcon class="h-4 w-4" />
            Lista
          </button>
          <button
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
            :class="viewMode === 'calendar' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="viewMode = 'calendar'"
          >
            <CalendarIcon class="h-4 w-4" />
            Calendario
          </button>
        </div>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openCreateModal">
          Nueva Reserva
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

    <AppointmentFiltersBar
      :filters="filters"
      @update:filters="filters = $event"
      @change="applyFilters"
      @clear="clearFilters"
    />

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="card p-4 flex items-center gap-4">
        <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="skeleton h-4 w-40 rounded" />
          <div class="skeleton h-3 w-56 rounded" />
        </div>
        <div class="skeleton h-6 w-24 rounded-full" />
      </div>
    </div>

    <template v-else>
      <AppointmentCalendarView
        v-if="viewMode === 'calendar'"
        :appointments="appointments"
        @edit="openEditModal"
        @range-change="onCalendarRangeChange"
      />
      <AppointmentListView
        v-else
        :appointments="appointments"
        :stats="stats"
        :updating-appt-id="updatingApptId"
        @create="openCreateModal"
        @edit="openEditModal"
        @delete="handleDelete"
        @status-change="handleStatusChange"
      />
    </template>

    <AppointmentFormModal
      :show="showModal"
      :editing-id="editingId"
      :saving="saving"
      :form="form"
      @update:form="form = $event"
      @close="closeModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PlusIcon, CalendarIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { CalendarDaysIcon, ListBulletIcon } from '@heroicons/vue/24/solid'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import AppointmentFiltersBar from '~/components/appointments/AppointmentFiltersBar.vue'
import AppointmentCalendarView from '~/components/appointments/AppointmentCalendarView.vue'
import AppointmentListView from '~/components/appointments/AppointmentListView.vue'
import AppointmentFormModal, { type AppointmentFormData } from '~/components/appointments/AppointmentFormModal.vue'
import {
  useAppointments,
  STATUS_LABELS,
  type AppointmentStatus,
  type Appointment,
} from '~/composables/commerce/useAppointments'
import { useToast } from '~/composables/ui/useToast'
import { useConfirm } from '~/composables/ui/useConfirm'

definePageMeta({ middleware: 'auth' })

const {
  appointments,
  stats,
  loading,
  error,
  loadAgendamientos,
  createAgendamiento,
  updateAgendamiento,
  deleteAgendamiento,
  updateStatus,
} = useAppointments()

const toast = useToast()
const { confirm } = useConfirm()

// ─── Vista ────────────────────────────────────────────────────────────────────
const viewMode = ref<'calendar' | 'list'>('list')

// ─── Filtros ──────────────────────────────────────────────────────────────────
const filters = ref({ status: '', dateFrom: '', dateTo: '' })

function applyFilters() {
  loadAgendamientos({
    status: filters.value.status as AppointmentStatus || undefined,
    dateFrom: filters.value.dateFrom || undefined,
    dateTo: filters.value.dateTo || undefined,
  })
}

function clearFilters() {
  filters.value = { status: '', dateFrom: '', dateTo: '' }
  loadAgendamientos()
}

function onCalendarRangeChange(dateFrom: string, dateTo: string) {
  filters.value.dateFrom = dateFrom
  filters.value.dateTo = dateTo
  applyFilters()
}

// ─── Header stats ─────────────────────────────────────────────────────────────
const headerStats = computed(() => [
  { label: 'Hoy',         value: String(stats.value.todayTotal) },
  { label: 'Pendientes',  value: String(stats.value.pending) },
  { label: 'Confirmadas', value: String(stats.value.confirmed) },
  { label: 'Canceladas',  value: String(stats.value.cancelled) },
])

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal = ref(false)
const saving    = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = (): AppointmentFormData => ({
  customerName:  '',
  customerPhone: '',
  date:          '',
  time:          '',
  partySize:     2,
  tableNumber:   undefined,
  notes:         '',
  status:        'PENDING',
})

const form = ref<AppointmentFormData>(emptyForm())

function openCreateModal() {
  editingId.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEditModal(appt: Appointment) {
  editingId.value = appt.id
  const d = new Date(appt.date)
  form.value = {
    customerName:  appt.customerName,
    customerPhone: appt.customerPhone ?? '',
    date:          d.toISOString().slice(0, 10),
    time:          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    partySize:     appt.partySize,
    tableNumber:   appt.tableNumber,
    notes:         appt.notes ?? '',
    status:        appt.status,
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function handleSubmit() {
  if (saving.value) return
  saving.value = true
  const payload = {
    customerName:  form.value.customerName.trim(),
    customerPhone: form.value.customerPhone?.trim() || undefined,
    date:          `${form.value.date}T${form.value.time}:00`,
    partySize:     form.value.partySize,
    tableNumber:   form.value.tableNumber || undefined,
    notes:         form.value.notes?.trim() || undefined,
    ...(editingId.value && { status: form.value.status }),
  }
  try {
    const ok = editingId.value
      ? await updateAgendamiento(editingId.value, payload)
      : await createAgendamiento(payload)
    if (ok) {
      toast.success(editingId.value ? 'Reserva actualizada correctamente' : 'Reserva creada correctamente')
      closeModal()
    }
  } finally {
    saving.value = false
  }
}

const updatingApptId = ref<string | null>(null)
async function handleStatusChange(appt: Appointment, newStatus: AppointmentStatus) {
  if (appt.status === newStatus || updatingApptId.value) return
  updatingApptId.value = appt.id
  try {
    const ok = await updateStatus(appt.id, newStatus)
    if (ok) toast.success('Estado actualizado', `Reserva marcada como ${STATUS_LABELS[newStatus]}`)
  } finally {
    updatingApptId.value = null
  }
}

async function handleDelete(appt: Appointment) {
  const ok = await confirm({
    title: 'Eliminar Reserva',
    message: `¿Estás seguro de eliminar la reserva de ${appt.customerName}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
  })
  if (ok) {
    const deleted = await deleteAgendamiento(appt.id)
    if (deleted) toast.success('Reserva eliminada')
  }
}

onMounted(() => loadAgendamientos())
</script>
