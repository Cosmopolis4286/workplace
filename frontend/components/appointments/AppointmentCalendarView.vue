<template>
  <div class="card p-6">
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
            @click="$emit('edit', appt)"
          >{{ formatTime(appt.date) }} {{ appt.customerName }}</button>
          <span v-if="cell.appointments.length > 3" class="text-[10px] text-gray-400 pl-1">
            +{{ cell.appointments.length - 3 }} más
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { STATUS_CLASSES, type Appointment } from '~/composables/commerce/useAppointments'
import { useDateFormat } from '~/composables/core/useDateFormat'

const props = defineProps<{
  appointments: Appointment[]
}>()

const emit = defineEmits<{
  edit: [appt: Appointment]
  'range-change': [dateFrom: string, dateTo: string]
}>()

const { formatMonthYear } = useDateFormat()

const calendarDate = ref(new Date())

const calendarTitle = computed(() =>
  formatMonthYear(calendarDate.value)
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
  const dateFrom = `${y}-${m}-01`
  const lastDay = new Date(y, d.getMonth() + 1, 0).getDate()
  const dateTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  emit('range-change', dateFrom, dateTo)
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
      appointments: props.appointments.filter(a => a.date.startsWith(dateStr)),
    })
  }
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({ key: `next-${i}`, day: i, isOtherMonth: true, isToday: false, appointments: [] as Appointment[] })
  }
  return cells
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}
</script>
