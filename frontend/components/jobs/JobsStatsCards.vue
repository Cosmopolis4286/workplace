<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="card p-4">
      <p class="text-xs text-gray-500 mb-1">Total</p>
      <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
    </div>
    <div class="card p-4">
      <p class="text-xs text-gray-500 mb-1">Activos</p>
      <p class="text-2xl font-bold text-green-600">{{ stats.activos }}</p>
    </div>
    <div class="card p-4">
      <p class="text-xs text-gray-500 mb-1">Pausados</p>
      <p class="text-2xl font-bold text-yellow-600">{{ stats.pausados }}</p>
    </div>
    <div class="card p-4">
      <p class="text-xs text-gray-500 mb-1">Cerrados</p>
      <p class="text-2xl font-bold text-gray-400">{{ stats.cerrados }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  stats: { total: number; activos: number; pausados: number; cerrados: number }
}>()
</script>
