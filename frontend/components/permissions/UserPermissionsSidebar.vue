<template>
  <div class="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-4">
    <div class="bg-white rounded-lg p-3 border border-gray-200">
      <div class="text-xs text-gray-500 uppercase font-semibold">Estado Actual</div>
      <div class="mt-2 space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">Permisos del rol:</span>
          <span class="font-medium text-blue-600">{{ rolePermissionsCount }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Personalizados:</span>
          <span class="font-medium text-amber-600">{{ userPermissionsCount }}</span>
        </div>
        <div class="flex justify-between border-t pt-1 mt-1">
          <span class="text-gray-800 font-medium">Total efectivos:</span>
          <span class="font-bold text-green-600">{{ effectivePermissionsCount }}</span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg p-3 border border-gray-200">
      <div class="text-xs text-gray-500 uppercase font-semibold mb-2">Leyenda</div>
      <div class="space-y-2 text-xs">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded bg-blue-500"></span>
          <span class="text-gray-600">Del rol</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded bg-green-500"></span>
          <span class="text-gray-600">Concedido al usuario</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded bg-red-500"></span>
          <span class="text-gray-600">Denegado al usuario</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded bg-gray-300"></span>
          <span class="text-gray-600">No disponible</span>
        </div>
      </div>
    </div>

    <button
      v-if="hasCustomPermissions"
      @click="$emit('reset')"
      :disabled="resetting || !canManageThisUser"
      class="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      <svg v-if="resetting" class="w-4 h-4 inline mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      {{ resetting ? 'Reseteando...' : 'Resetear permisos' }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  rolePermissionsCount: number
  userPermissionsCount: number
  effectivePermissionsCount: number
  hasCustomPermissions: boolean
  resetting: boolean
  canManageThisUser: boolean
}>()

defineEmits<{
  reset: []
}>()
</script>
