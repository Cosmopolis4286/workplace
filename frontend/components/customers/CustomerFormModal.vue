<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @mousedown.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')" />
        <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100"
          leave-active-class="ease-in duration-150" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
          <div v-if="show" class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ editing ? 'Editar Cliente' : 'Nuevo Cliente' }}
              </h2>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="$emit('close')">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <form @submit.prevent="$emit('submit')" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="form.name" type="text" required maxlength="100" placeholder="Nombre completo" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input v-model="form.email" type="email" maxlength="100" placeholder="correo@ejemplo.com" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input v-model="form.phone" type="text" maxlength="30" placeholder="+58 412-1234567" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
                <input v-model="form.address" type="text" maxlength="200" placeholder="Dirección del cliente" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Segmento</label>
                <select v-model="form.segment" class="input-field">
                  <option value="NEW">Nuevo</option>
                  <option value="REGULAR">Regular</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea v-model="form.notes" maxlength="500" rows="3" placeholder="Preferencias, observaciones..." class="input-field resize-none" />
              </div>

              <div v-if="formError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {{ formError }}
              </div>

              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
                <button type="submit" class="btn-primary flex-1" :disabled="saving">
                  {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear Cliente') }}
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import type { CustomerSegment } from '~/composables/customers/useCustomers'

export interface CustomerFormData {
  name: string
  email: string
  phone: string
  address: string
  notes: string
  segment: CustomerSegment
}

defineProps<{
  show: boolean
  editing: boolean
  saving: boolean
  formError: string | null
  form: CustomerFormData
}>()

defineEmits<{
  close: []
  submit: []
}>()
</script>
