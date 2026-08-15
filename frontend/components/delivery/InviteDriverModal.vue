<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-semibold text-gray-900">Invitar Repartidor</h3>
            <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>
          <p class="text-xs text-gray-500 mb-4">
            El repartidor recibirá un correo para crear su cuenta y verificar su identidad. Solo podrá recibir entregas una vez aprobada su verificación.
          </p>
          <form @submit.prevent="$emit('submit')" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Correo <span class="text-red-500">*</span></label>
              <input v-model="form.email" type="email" required placeholder="repartidor@correo.com" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nombre (opcional)</label>
              <input v-model="form.name" placeholder="Nombre completo" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
              <input v-model="form.phone" placeholder="+58 412 000 0000" class="input-field" />
            </div>
            <div v-if="error" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</div>
            <div class="flex gap-3 pt-2">
              <button type="button" class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
              <button type="submit" class="btn-primary flex-1" :disabled="sending">
                {{ sending ? 'Enviando...' : 'Enviar invitación' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import type { InviteDriverPayload } from '~/composables/delivery/useDelivery'

defineProps<{
  show: boolean
  sending: boolean
  error: string | null
  form: InviteDriverPayload
}>()

defineEmits<{
  close: []
  submit: []
}>()
</script>
