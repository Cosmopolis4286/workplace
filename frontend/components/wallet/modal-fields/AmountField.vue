<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
    <div class="relative">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{{ currency ?? 'USD' }}</span>
      <input
        type="number"
        :min="0.01"
        step="0.01"
        :max="max"
        required
        class="input pl-14"
        placeholder="0.00"
        :value="modelValue"
        @input="$emit('update:modelValue', parseFloat(($event.target as HTMLInputElement).value) || undefined)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: number | undefined
  currency?: string
  max?: number
}>()

defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()
</script>
