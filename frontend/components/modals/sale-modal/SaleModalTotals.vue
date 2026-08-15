<template>
  <div class="px-6 py-4 bg-gray-50">
    <div class="grid grid-cols-2 gap-4 mb-3">
      <div>
        <label class="label-field">Descuento ($)</label>
        <input :value="discount" type="number" min="0" step="0.01" class="input-field" @input="$emit('update:discount', Number(($event.target as HTMLInputElement).value))" />
      </div>
      <div>
        <label class="label-field">Costo Envío ($)</label>
        <input :value="deliveryFee" type="number" min="0" step="0.01" class="input-field" @input="$emit('update:deliveryFee', Number(($event.target as HTMLInputElement).value))" />
      </div>
    </div>
    <div class="space-y-1.5 text-sm border-t border-gray-200 pt-3">
      <div class="flex justify-between text-gray-600">
        <span>Subtotal</span>
        <span>{{ formatCurrency(subtotal) }}</span>
      </div>
      <div v-if="discount > 0" class="flex justify-between text-green-600">
        <span>Descuento</span>
        <span>-{{ formatCurrency(discount) }}</span>
      </div>
      <div v-if="deliveryFee > 0" class="flex justify-between text-gray-600">
        <span>Envío</span>
        <span>+{{ formatCurrency(deliveryFee) }}</span>
      </div>
      <div class="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
        <span>Total</span>
        <span>{{ formatCurrency(total) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  discount: number
  deliveryFee: number
  subtotal: number
  total: number
  formatCurrency: (v: number) => string
}>()

defineEmits<{
  'update:discount': [value: number]
  'update:deliveryFee': [value: number]
}>()
</script>

<style scoped>
.label-field {
  @apply block text-xs font-medium text-gray-600 mb-1;
}
</style>
