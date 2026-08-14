<template>
  <div class="card p-1 flex gap-1 overflow-x-auto scrollbar-none">
    <button
      v-for="chip in statusChips"
      :key="chip.value ?? 'all'"
      class="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
      :class="modelValue === chip.value
        ? 'bg-red-600 text-white shadow-sm'
        : 'text-gray-500 hover:bg-gray-50'"
      @click="$emit('update:modelValue', chip.value)"
    >{{ chip.label }}</button>
  </div>
</template>

<script setup lang="ts">
import type { OrderStatus } from '~/composables/catalog/useMerchantOrders'

defineProps<{
  modelValue: OrderStatus | undefined
}>()

defineEmits<{
  'update:modelValue': [value: OrderStatus | undefined]
}>()

const statusChips: { label: string; value: OrderStatus | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Pendiente',   value: 'PENDING' },
  { label: 'Confirmado',  value: 'CONFIRMED' },
  { label: 'Preparando',  value: 'PREPARING' },
  { label: 'Listo',       value: 'READY' },
  { label: 'En Entrega',  value: 'OUT_FOR_DELIVERY' },
  { label: 'Entregado',   value: 'DELIVERED' },
  { label: 'Cancelado',   value: 'CANCELLED' },
]
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
