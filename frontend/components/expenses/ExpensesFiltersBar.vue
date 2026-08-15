<template>
  <div class="card p-4">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <input
        v-model="filters.search"
        type="text"
        placeholder="Buscar..."
        class="input-field col-span-2 sm:col-span-1"
        @input="$emit('search-input')"
      />
      <select v-model="filters.status" class="input-field" @change="$emit('apply')">
        <option value="">Todos los estados</option>
        <option v-for="(label, val) in statusLabels" :key="val" :value="val">{{ label }}</option>
      </select>
      <select v-model="filters.type" class="input-field" @change="$emit('apply')">
        <option value="">Todos los tipos</option>
        <option v-for="(label, val) in typeLabels" :key="val" :value="val">{{ label }}</option>
      </select>
      <select v-model="filters.categoryId" class="input-field" @change="$emit('apply')">
        <option value="">Todas las categorías</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
    </div>
    <div class="flex gap-3 mt-3">
      <input v-model="filters.dateFrom" type="date" class="input-field flex-1" @change="$emit('apply')" />
      <input v-model="filters.dateTo" type="date" class="input-field flex-1" @change="$emit('apply')" />
      <button class="btn-secondary text-sm" @click="$emit('clear')">Limpiar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExpenseCategory, ExpenseStatus, ExpenseType } from '~/composables/commerce/useExpenses'

export interface ExpensesFilterState {
  search: string
  status: ExpenseStatus | ''
  type: ExpenseType | ''
  categoryId: string
  dateFrom: string
  dateTo: string
}

defineProps<{
  filters: ExpensesFilterState
  categories: ExpenseCategory[]
  statusLabels: Record<ExpenseStatus, string>
  typeLabels: Record<ExpenseType, string>
}>()

defineEmits<{
  'search-input': []
  apply: []
  clear: []
}>()
</script>
