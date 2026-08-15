<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold text-gray-900 mb-2">¿Resetear permisos?</h3>
        <p class="text-sm text-gray-500 mb-6">
          Se eliminarán todos los permisos personalizados de este usuario. Volverá a usar solo los permisos de su rol.
        </p>
        <div class="flex gap-3">
          <button
            @click="$emit('close')"
            class="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >Cancelar</button>
          <button
            @click="$emit('confirm')"
            :disabled="resetting"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
          >{{ resetting ? 'Reseteando...' : 'Resetear' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  resetting: boolean
}>()

defineEmits<{
  close: []
  confirm: []
}>()
</script>
