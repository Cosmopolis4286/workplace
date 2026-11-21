<template>
  <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <div class="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-sm font-semibold text-gray-900">Módulos del sistema</h3>
        <p class="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
          Desactivar un módulo lo oculta del menú de todos los usuarios, incluido SUPERADMIN.
          Utilízalo para mantenimiento o despliegues graduales; no sustituye la matriz de permisos.
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2 text-xs">
        <span class="rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-700">{{ enabledCount }} activos</span>
        <span class="rounded-lg bg-gray-100 px-2.5 py-1.5 font-semibold text-gray-600">{{ modules.length }} total</span>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-[76px] animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
    </div>

    <div v-else-if="modules.length" class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      <label
        v-for="module in modules"
        :key="module.module"
        class="flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all focus-within:ring-2 focus-within:ring-workplace-red/30"
        :class="module.enabled ? 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30' : 'border-red-200 bg-red-50/50'"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="module.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-100 text-red-700'">
          <Squares2X2Icon class="h-5 w-5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold" :class="module.enabled ? 'text-gray-800' : 'text-red-800'">{{ moduleLabels[module.module] ?? module.label ?? module.module }}</span>
          <span class="mt-0.5 block text-xs" :class="module.enabled ? 'text-emerald-700' : 'text-red-600'">{{ module.enabled ? 'Disponible en la plataforma' : 'Desactivado globalmente' }}</span>
        </span>
        <input
          type="checkbox"
          :checked="module.enabled"
          :disabled="togglingModule === module.module"
          @change="$emit('toggle', module, ($event.target as HTMLInputElement).checked)"
          class="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-wait disabled:opacity-50"
          :aria-label="'Activar o desactivar ' + (moduleLabels[module.module] ?? module.module)"
        />
      </label>
    </div>

    <div v-else class="px-4 py-14 text-center">
      <Squares2X2Icon class="mx-auto h-10 w-10 text-gray-300" />
      <p class="mt-3 text-sm font-semibold text-gray-700">No hay módulos configurados</p>
      <p class="mt-1 text-xs text-gray-500">Cuando el catálogo esté disponible, aparecerá aquí.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Squares2X2Icon } from '@heroicons/vue/24/outline'

interface SystemModuleRow { module: string; enabled: boolean; label: string | null }

const props = defineProps<{
  loading: boolean
  modules: SystemModuleRow[]
  togglingModule: string | null
  moduleLabels: Record<string, string>
}>()

defineEmits<{
  toggle: [module: SystemModuleRow, enabled: boolean]
}>()

const enabledCount = computed(() => props.modules.filter(module => module.enabled).length)
</script>
