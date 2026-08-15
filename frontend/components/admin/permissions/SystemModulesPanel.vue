<template>
  <div class="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
      <h2 class="font-semibold text-gray-800 text-sm">Módulos del sistema</h2>
      <p class="text-xs text-gray-500 mt-0.5">
        Apagar un módulo aquí lo oculta del sidebar de <strong>todos</strong> los usuarios, incluido SUPERADMIN.
        Úsalo para mantenimiento o lanzamientos por etapas — no reemplaza la matriz de permisos.
      </p>
    </div>
    <div v-if="loading" class="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      <div v-for="i in 8" :key="i" class="h-9 bg-gray-100 rounded-lg animate-pulse"/>
    </div>
    <div v-else class="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      <label
        v-for="m in modules"
        :key="m.module"
        class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
        :class="m.enabled ? 'border-gray-200 hover:border-gray-300' : 'border-red-200 bg-red-50/50'"
      >
        <input
          type="checkbox"
          :checked="m.enabled"
          :disabled="togglingModule === m.module"
          @change="$emit('toggle', m, ($event.target as HTMLInputElement).checked)"
          class="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 focus:ring-2 disabled:opacity-40"
        />
        <span class="text-sm" :class="m.enabled ? 'text-gray-700' : 'text-red-600 font-medium'">
          {{ moduleLabels[m.module] ?? m.module }}
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SystemModuleRow { module: string; enabled: boolean; label: string | null }

defineProps<{
  loading: boolean
  modules: SystemModuleRow[]
  togglingModule: string | null
  moduleLabels: Record<string, string>
}>()

defineEmits<{
  toggle: [module: SystemModuleRow, enabled: boolean]
}>()
</script>
