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

    <!-- Filtros -->
    <div class="card p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div class="flex flex-wrap gap-3 flex-1">
          <input
            v-model="filters.dateFrom"
            type="date"
            class="input-field w-auto"
            @change="applyFilters"
          />
          <input
            v-model="filters.dateTo"
            type="date"
            class="input-field w-auto"
            @change="applyFilters"
          />
          <select
            v-model="filters.status"
            class="input-field w-auto"
            @change="applyFilters"
          >
            <option value="">Todos los estados</option>
            <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <button
          v-if="filters.status || filters.dateFrom || filters.dateTo"
          class="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap"
          @click="clearFilters"
        >
          Limpiar filtros
        </button>
      </div>
    </div>

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

      <!-- ── Vista Calendario ────────────────────────────────────────────────── -->
      <div v-if="viewMode === 'calendar'" class="card p-6">
        <!-- Nav mes -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-base font-semibold text-gray-900 capitalize">{{ calendarTitle }}</h2>
          <div class="flex items-center gap-1">
            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" @click="prevMonth">
              <ChevronLeftIcon class="h-5 w-5 text-gray-600" />
            </button>
            <button
              class="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              @click="goToToday"
            >Hoy</button>
            <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" @click="nextMonth">
              <ChevronRightIcon class="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <!-- Cabecera días -->
        <div class="grid grid-cols-7 mb-1">
          <div
            v-for="day in ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']"
            :key="day"
            class="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider"
          >{{ day }}</div>
        </div>

        <!-- Celdas -->
        <div class="grid grid-cols-7 border-t border-l border-gray-100 rounded-b-xl overflow-hidden">
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            class="min-h-[88px] p-2 border-b border-r border-gray-100 relative"
            :class="[
              cell.isOtherMonth ? 'bg-gray-50/60' : 'bg-white',
              cell.isToday ? 'ring-2 ring-inset ring-red-400' : ''
            ]"
          >
            <span
              class="text-xs font-medium leading-none"
              :class="cell.isOtherMonth ? 'text-gray-300' : cell.isToday ? 'inline-flex w-5 h-5 items-center justify-center rounded-full bg-red-600 text-white font-bold text-[10px]' : 'text-gray-600'"
            >{{ cell.day }}</span>
            <div class="mt-1 space-y-0.5">
              <button
                v-for="appt in cell.appointments.slice(0, 3)"
                :key="appt.id"
                class="w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium"
                :class="STATUS_CLASSES[appt.status]"
                @click="openEditModal(appt)"
              >{{ formatTime(appt.date) }} {{ appt.customerName }}</button>
              <span v-if="cell.appointments.length > 3" class="text-[10px] text-gray-400 pl-1">
                +{{ cell.appointments.length - 3 }} más
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Vista Lista ──────────────────────────────────────────────────────── -->
      <template v-else>

        <!-- Empty state -->
        <div v-if="appointments.length === 0" class="card p-12 text-center">
          <CalendarIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 font-medium">No hay agendamientos</p>
          <p class="text-sm text-gray-400 mt-1">Crea una nueva reserva para comenzar</p>
          <button class="btn-primary mt-4" @click="openCreateModal">
            <PlusIcon class="h-4 w-4 inline mr-1.5" />
            Nueva Reserva
          </button>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Lista agrupada por fecha -->
          <div class="lg:col-span-2 space-y-4">
            <div v-for="group in groupedAppointments" :key="group.date" class="card overflow-hidden">
              <!-- Cabecera de fecha -->
              <div class="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 class="text-xs font-semibold text-gray-500 tracking-wider">
                  {{ group.dateLabel }}
                </h3>
                <span class="text-xs text-gray-400">{{ group.items.length }} reserva{{ group.items.length !== 1 ? 's' : '' }}</span>
              </div>

              <!-- Filas -->
              <div class="divide-y divide-gray-100">
                <div
                  v-for="appt in group.items"
                  :key="appt.id"
                  class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
                >
                  <!-- Avatar -->
                  <div class="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span class="text-sm font-bold text-red-700">{{ appt.customerName[0].toUpperCase() }}</span>
                  </div>

                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-semibold text-gray-900 truncate">{{ appt.customerName }}</p>
                      <span class="badge flex-shrink-0" :class="STATUS_CLASSES[appt.status]">
                        {{ STATUS_LABELS[appt.status] }}
                      </span>
                    </div>
                    <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
                      <span class="flex items-center gap-1">
                        <ClockIcon class="h-3 w-3" />{{ formatTime(appt.date) }}
                      </span>
                      <span class="flex items-center gap-1">
                        <UsersIcon class="h-3 w-3" />{{ appt.partySize }} personas
                      </span>
                      <span v-if="appt.tableNumber" class="flex items-center gap-1">
                        <TableCellsIcon class="h-3 w-3" />Mesa {{ appt.tableNumber }}
                      </span>
                      <span v-if="appt.customerPhone" class="flex items-center gap-1">
                        <PhoneIcon class="h-3 w-3" />{{ appt.customerPhone }}
                      </span>
                    </p>
                    <p v-if="appt.notes" class="text-xs text-gray-400 italic mt-0.5 truncate">"{{ appt.notes }}"</p>
                  </div>

                  <!-- Acciones hover -->
                  <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      :value="appt.status"
                      class="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-red-400"
                      @change="handleStatusChange(appt, ($event.target as HTMLSelectElement).value as AppointmentStatus)"
                    >
                      <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
                    </select>
                    <button
                      class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                      @click="openEditModal(appt)"
                    >
                      <PencilIcon class="h-4 w-4" />
                    </button>
                    <button
                      class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                      @click="handleDelete(appt)"
                    >
                      <TrashIcon class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar resumen -->
          <div class="space-y-4">
            <!-- Por estado -->
            <div class="card p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-4">Por estado</h3>
              <div class="space-y-3">
                <div v-for="s in statusSummary" :key="s.key" class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
                    <span class="text-sm text-gray-600">{{ s.label }}</span>
                  </div>
                  <span class="text-sm font-bold text-gray-900">{{ s.count }}</span>
                </div>
              </div>
            </div>

            <!-- Próximas reservas -->
            <div v-if="upcomingAppointments.length > 0" class="card p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Próximas reservas</h3>
              <div class="space-y-3">
                <div
                  v-for="appt in upcomingAppointments"
                  :key="appt.id"
                  class="flex items-start gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
                  @click="openEditModal(appt)"
                >
                  <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                    {{ appt.customerName[0].toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-gray-900 truncate">{{ appt.customerName }}</p>
                    <p class="text-[10px] text-gray-400">{{ formatDateTime(appt.date) }} · {{ appt.partySize }} personas</p>
                  </div>
                  <span class="badge text-[10px]" :class="STATUS_CLASSES[appt.status]">
                    {{ STATUS_LABELS[appt.status] }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Hoy -->
            <div v-if="stats.todayTotal > 0" class="card p-5 border-l-4 border-l-red-400">
              <div class="flex items-center gap-2 mb-1">
                <CalendarIcon class="h-4 w-4 text-red-500" />
                <p class="text-sm font-semibold text-gray-700">Reservas hoy</p>
              </div>
              <p class="text-3xl font-black text-red-600">{{ stats.todayTotal }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ stats.pending }} pendiente{{ stats.pending !== 1 ? 's' : '' }} de confirmar</p>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Modal crear / editar -->
    <Teleport to="body">
      <Transition
        enter-active-class="ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeModal">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeModal" />
          <Transition
            enter-active-class="ease-out duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="ease-in duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="showModal" class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
              <div class="flex items-center justify-between mb-5">
                <h2 class="text-lg font-semibold text-gray-900">
                  {{ editingId ? 'Editar Reserva' : 'Nueva Reserva' }}
                </h2>
                <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="closeModal">
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>

              <form class="space-y-4" @submit.prevent="handleSubmit">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Nombre del cliente <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.customerName"
                    type="text"
                    required
                    maxlength="100"
                    placeholder="Ej. María García"
                    class="input-field"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    v-model="form.customerPhone"
                    type="tel"
                    maxlength="30"
                    placeholder="+58 412 000 0000"
                    class="input-field"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Fecha <span class="text-red-500">*</span></label>
                    <input v-model="form.date" type="date" required class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Hora <span class="text-red-500">*</span></label>
                    <input v-model="form.time" type="time" required class="input-field" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Personas <span class="text-red-500">*</span></label>
                    <input v-model.number="form.partySize" type="number" required min="1" max="100" class="input-field" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Mesa (opcional)</label>
                    <input v-model.number="form.tableNumber" type="number" min="1" placeholder="Nº mesa" class="input-field" />
                  </div>
                </div>

                <div v-if="editingId">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                  <select v-model="form.status" class="input-field">
                    <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Notas (opcional)</label>
                  <textarea
                    v-model="form.notes"
                    rows="2"
                    maxlength="500"
                    placeholder="Alergias, preferencias especiales..."
                    class="input-field resize-none"
                  />
                </div>

                <div class="flex gap-3 pt-2">
                  <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary flex-1" :disabled="saving">
                    {{ saving ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Reserva') }}
                  </button>
                </div>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UsersIcon,
  PhoneIcon,
} from '@heroicons/vue/24/outline'
import {
  CalendarDaysIcon,
  ListBulletIcon,
  TableCellsIcon,
} from '@heroicons/vue/24/solid'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import {
  useAppointments,
  STATUS_LABELS,
  STATUS_CLASSES,
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

// ─── Header stats ─────────────────────────────────────────────────────────────
const headerStats = computed(() => [
  { label: 'Hoy',         value: String(stats.value.todayTotal) },
  { label: 'Pendientes',  value: String(stats.value.pending) },
  { label: 'Confirmadas', value: String(stats.value.confirmed) },
  { label: 'Canceladas',  value: String(stats.value.cancelled) },
])

// ─── Sidebar computados ───────────────────────────────────────────────────────
const statusSummary = computed(() => [
  { key: 'PENDING',   label: 'Pendientes',  count: stats.value.pending,   dot: 'bg-yellow-400' },
  { key: 'CONFIRMED', label: 'Confirmadas', count: stats.value.confirmed, dot: 'bg-green-400'  },
  { key: 'SEATED',    label: 'Sentadas',    count: appointments.value.filter(a => a.status === 'SEATED').length,    dot: 'bg-blue-400'   },
  { key: 'COMPLETED', label: 'Completadas', count: appointments.value.filter(a => a.status === 'COMPLETED').length, dot: 'bg-gray-400'   },
  { key: 'CANCELLED', label: 'Canceladas',  count: stats.value.cancelled, dot: 'bg-red-400'    },
  { key: 'NO_SHOW',   label: 'No show',     count: appointments.value.filter(a => a.status === 'NO_SHOW').length,    dot: 'bg-orange-400' },
])

const upcomingAppointments = computed(() => {
  const now = new Date()
  return appointments.value
    .filter(a => new Date(a.date) >= now && (a.status === 'PENDING' || a.status === 'CONFIRMED'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
})

// ─── Calendario ───────────────────────────────────────────────────────────────
const calendarDate = ref(new Date())

const calendarTitle = computed(() =>
  calendarDate.value.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
)

function prevMonth() {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() - 1)
  calendarDate.value = d
  syncCalendarFilters()
}

function nextMonth() {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + 1)
  calendarDate.value = d
  syncCalendarFilters()
}

function goToToday() {
  calendarDate.value = new Date()
  syncCalendarFilters()
}

function syncCalendarFilters() {
  const d = calendarDate.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  filters.value.dateFrom = `${y}-${m}-01`
  const lastDay = new Date(y, d.getMonth() + 1, 0).getDate()
  filters.value.dateTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  applyFilters()
}

const calendarCells = computed(() => {
  const year = calendarDate.value.getFullYear()
  const month = calendarDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const today = new Date()
  const cells = []

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ key: `prev-${i}`, day: daysInPrev - i, isOtherMonth: true, isToday: false, appointments: [] as Appointment[] })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday = date.toDateString() === today.toDateString()
    cells.push({
      key: dateStr, day, isOtherMonth: false, isToday,
      appointments: appointments.value.filter(a => a.date.startsWith(dateStr)),
    })
  }
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({ key: `next-${i}`, day: i, isOtherMonth: true, isToday: false, appointments: [] as Appointment[] })
  }
  return cells
})

// ─── Lista agrupada ───────────────────────────────────────────────────────────
const groupedAppointments = computed(() => {
  const map = new Map<string, { date: string; dateLabel: string; items: Appointment[] }>()
  for (const appt of appointments.value) {
    const dateKey = appt.date.slice(0, 10)
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        date: dateKey,
        dateLabel: new Date(dateKey + 'T12:00:00').toLocaleDateString('es-MX', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }),
        items: [],
      })
    }
    map.get(dateKey)!.items.push(appt)
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal = ref(false)
const saving    = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = () => ({
  customerName:  '',
  customerPhone: '',
  date:          '',
  time:          '',
  partySize:     2,
  tableNumber:   undefined as number | undefined,
  notes:         '',
  status:        'PENDING' as AppointmentStatus,
})

const form = ref(emptyForm())

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

async function handleStatusChange(appt: Appointment, newStatus: AppointmentStatus) {
  if (appt.status === newStatus) return
  const ok = await updateStatus(appt.id, newStatus)
  if (ok) toast.success('Estado actualizado', `Reserva marcada como ${STATUS_LABELS[newStatus]}`)
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
