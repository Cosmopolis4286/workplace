<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <!-- Checkbox de selección global -->
            <th v-if="selectable" class="w-10 px-4 py-3">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                @change="toggleAll"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </th>
            <slot name="headers" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <template v-if="rows.length > 0">
            <tr
              v-for="(row, i) in rows"
              :key="rowKey ? (row as Record<string, unknown>)[rowKey] as string : i"
              class="transition-colors"
              :class="[
                selectable && isSelected(row) ? 'bg-blue-50/60' : 'hover:bg-gray-50/80',
                selectable ? 'cursor-pointer' : '',
              ]"
              @click="selectable ? toggleRow(row) : undefined"
            >
              <!-- Checkbox por fila -->
              <td v-if="selectable" class="w-10 px-4 py-3" @click.stop="toggleRow(row)">
                <input
                  type="checkbox"
                  :checked="isSelected(row)"
                  @change="toggleRow(row)"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </td>
              <slot name="row" :row="row" :index="i" />
            </tr>
          </template>
          <tr v-else>
            <td
              :colspan="selectable ? slotsColspan + 1 : slotsColspan"
              class="px-4 py-12 text-center text-gray-400"
            >
              <slot name="empty">
                <svg class="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p class="font-medium">Sin resultados</p>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
      <span>{{ total }} {{ totalLabel }}</span>
      <div class="flex gap-2">
        <button
          @click="emit('page-change', currentPage - 1)"
          :disabled="currentPage <= 1"
          class="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >Anterior</button>
        <span class="px-3 py-1 text-gray-500">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="emit('page-change', currentPage + 1)"
          :disabled="currentPage >= totalPages"
          class="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >Siguiente</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  rows: T[]
  /** Habilita checkboxes de selección por fila */
  selectable?: boolean
  /** Key única del objeto para identificar filas (ej. 'id') */
  rowKey?: string
  /** IDs / valores de filas actualmente seleccionadas */
  selected?: T[]
  /** Total de registros (para paginación) */
  total?: number
  /** Registros por página */
  pageSize?: number
  /** Página actual */
  currentPage?: number
  /** Texto que acompaña el total (ej. 'usuarios en total') */
  totalLabel?: string
  /** Número de columnas del slot — para el colspan del empty state */
  slotsColspan?: number
}>(), {
  selectable: false,
  selected: () => [],
  total: 0,
  pageSize: 20,
  currentPage: 1,
  totalLabel: 'registros en total',
  slotsColspan: 6,
})

const emit = defineEmits<{
  'update:selected': [value: T[]]
  'page-change': [page: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function getKey(row: T): unknown {
  if (props.rowKey) return (row as Record<string, unknown>)[props.rowKey]
  return row
}

function isSelected(row: T): boolean {
  const key = getKey(row)
  return props.selected.some(s => getKey(s) === key)
}

const allSelected = computed(() => props.rows.length > 0 && props.rows.every(r => isSelected(r)))
const someSelected = computed(() => props.rows.some(r => isSelected(r)) && !allSelected.value)

function toggleRow(row: T) {
  if (!props.selectable) return
  const key = getKey(row)
  if (isSelected(row)) {
    emit('update:selected', props.selected.filter(s => getKey(s) !== key))
  } else {
    emit('update:selected', [...props.selected, row])
  }
}

function toggleAll() {
  if (allSelected.value) {
    emit('update:selected', [])
  } else {
    emit('update:selected', [...props.rows])
  }
}
</script>
