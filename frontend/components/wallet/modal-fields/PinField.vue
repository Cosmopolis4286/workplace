<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1">{{ label ?? 'PIN de seguridad *' }}</label>
    <input
      type="password"
      maxlength="6"
      minlength="6"
      pattern="\d{6}"
      inputmode="numeric"
      autocomplete="off"
      required
      class="input tracking-[0.5em] text-center font-mono text-lg"
      :placeholder="placeholder ?? '••••••'"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6))"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string | undefined
  label?: string
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
