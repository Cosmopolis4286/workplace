<template>
  <div class="grid gap-3 xl:justify-end xl:shrink-0" :class="colsClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Número máximo de columnas de botones antes de pasar a otra fila. */
  maxCols?: 1 | 2 | 3 | 4 | 5 | 6
}>(), {
  maxCols: 4,
})

const COLS_CLASSES: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-6',
}

const colsClass = computed(() => COLS_CLASSES[props.maxCols])
</script>
