<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="$emit('close')"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div class="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-4">
            <ExclamationTriangleIcon class="w-7 h-7 text-red-600" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">¿Cancelar el viaje?</h3>
          <p class="text-sm text-gray-500 text-center mb-6">
            Llevas {{ elapsedTime }} esperando. Si cancelas ahora tendrás que solicitar uno nuevo.
          </p>
          <div class="flex gap-3">
            <button @click="$emit('close')" class="btn-secondary flex-1">
              Seguir esperando
            </button>
            <button
              @click="$emit('confirm')"
              :disabled="cancelling"
              class="btn-primary flex-1 disabled:opacity-50"
            >
              {{ cancelling ? 'Cancelando...' : 'Sí, cancelar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

defineProps<{
  show: boolean
  elapsedTime: string
  cancelling: boolean
}>()

defineEmits<{
  close: []
  confirm: []
}>()
</script>
