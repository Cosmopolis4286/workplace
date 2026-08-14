<template>
  <div class="card-premium p-6 lg:col-span-2">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-lg mr-3">
        <InformationCircleIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Acerca de</h3>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-4 bg-gray-50 rounded-xl text-center">
        <p class="text-xs text-gray-500 mb-1">Versión de la app</p>
        <p class="font-bold text-gray-900">WorkPlace Manager v1.0</p>
      </div>
      <div class="p-4 bg-gray-50 rounded-xl text-center">
        <p class="text-xs text-gray-500 mb-1">Tu cuenta</p>
        <p class="font-bold text-gray-900 truncate">{{ email ?? '—' }}</p>
      </div>
      <div class="p-4 bg-gray-50 rounded-xl text-center">
        <p class="text-xs text-gray-500 mb-1">Rol</p>
        <p class="font-bold text-gray-900">{{ roleLabel }}</p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <span class="text-sm text-gray-500 font-medium self-center">Soporte:</span>
      <a href="mailto:soporte@workplace-manager.app" class="text-sm text-workplace-red hover:underline font-medium">soporte@workplace-manager.app</a>
      <span class="text-gray-300">|</span>
      <span class="text-sm text-gray-500">© 2026 WorkPlace Manager. Todos los derechos reservados.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'

defineProps<{
  email: string | null | undefined
  roleLabel: string
}>()
</script>
