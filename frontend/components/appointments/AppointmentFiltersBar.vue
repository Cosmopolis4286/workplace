<template>
  <div class="card p-4 mb-6">
    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div class="flex flex-wrap gap-3 flex-1">
        <input
          :value="filters.dateFrom"
          type="date"
          class="input-field w-auto"
          @change="onField('dateFrom', ($event.target as HTMLInputElement).value)"
        />
        <input
          :value="filters.dateTo"
          type="date"
          class="input-field w-auto"
          @change="onField('dateTo', ($event.target as HTMLInputElement).value)"
        />
        <select
          :value="filters.status"
          class="input-field w-auto"
          @change="onField('status', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">Todos los estados</option>
          <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <button
        v-if="filters.status || filters.dateFrom || filters.dateTo"
        class="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap"
        @click="$emit('clear')"
      >
        Limpiar filtros
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { STATUS_LABELS } from '~/composables/commerce/useAppointments'

export interface AppointmentFormFilters {
  status: string
  dateFrom: string
  dateTo: string
}

const props = defineProps<{
  filters: AppointmentFormFilters
}>()

const emit = defineEmits<{
  'update:filters': [filters: AppointmentFormFilters]
  change: []
  clear: []
}>()

function onField(key: keyof AppointmentFormFilters, value: string) {
  emit('update:filters', { ...props.filters, [key]: value })
  emit('change')
}
</script>
