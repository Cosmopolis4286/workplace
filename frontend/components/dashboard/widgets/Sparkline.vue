<template>
  <div class="flex items-end gap-0.5 h-6">
    <div
      v-for="(v, i) in normalized"
      :key="i"
      class="flex-1 rounded-sm transition-all duration-500"
      :class="v === null ? 'bg-gray-100' : colorClass"
      :style="{ height: v === null ? '15%' : `${Math.max(8, v)}%`, opacity: v === null ? 0.4 : 1 }"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  values: (number | null)[]
  color?: 'red' | 'blue' | 'amber' | 'emerald'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue',
})

const colorClasses: Record<string, string> = {
  red: 'bg-red-400',
  blue: 'bg-blue-400',
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-400',
}

const colorClass = computed(() => colorClasses[props.color])

const normalized = computed(() => {
  const real = props.values.filter((v): v is number => v !== null)
  const max = Math.max(1, ...real)
  return props.values.map(v => (v === null ? null : Math.round((v / max) * 100)))
})
</script>
