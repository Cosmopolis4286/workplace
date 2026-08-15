<template>
  <div class="flex gap-3 pt-2">
    <button type="button" class="btn-secondary flex-1" @click="$emit('cancel')">Cancelar</button>
    <button type="submit" class="btn-primary flex-1" :disabled="loading">
      <span v-if="loading" class="flex items-center justify-center gap-2">
        <ArrowPathIcon class="h-4 w-4 animate-spin" />Procesando
      </span>
      <template v-else>{{ confirmLabel ?? 'Confirmar' }}</template>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ArrowPathIcon } from '@heroicons/vue/24/outline'

defineProps<{
  loading?: boolean
  confirmLabel?: string
}>()

defineEmits<{
  cancel: []
}>()
</script>
