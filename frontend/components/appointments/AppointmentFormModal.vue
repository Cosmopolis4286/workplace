<template>
  <Teleport to="body">
    <Transition
      enter-active-class="ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')" />
        <Transition
          enter-active-class="ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="show" class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ editingId ? 'Editar Reserva' : 'Nueva Reserva' }}
              </h2>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="$emit('close')">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <form class="space-y-4" @submit.prevent="$emit('submit')">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre del cliente <span class="text-red-500">*</span></label>
                <input
                  :value="form.customerName"
                  type="text"
                  required
                  maxlength="100"
                  placeholder="Ej. María García"
                  class="input-field"
                  @input="update('customerName', ($event.target as HTMLInputElement).value)"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  :value="form.customerPhone"
                  type="tel"
                  maxlength="30"
                  placeholder="+58 412 000 0000"
                  class="input-field"
                  @input="update('customerPhone', ($event.target as HTMLInputElement).value)"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Fecha <span class="text-red-500">*</span></label>
                  <input :value="form.date" type="date" required class="input-field" @input="update('date', ($event.target as HTMLInputElement).value)" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Hora <span class="text-red-500">*</span></label>
                  <input :value="form.time" type="time" required class="input-field" @input="update('time', ($event.target as HTMLInputElement).value)" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Personas <span class="text-red-500">*</span></label>
                  <input :value="form.partySize" type="number" required min="1" max="100" class="input-field" @input="update('partySize', Number(($event.target as HTMLInputElement).value))" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Mesa (opcional)</label>
                  <input :value="form.tableNumber" type="number" min="1" placeholder="Nº mesa" class="input-field" @input="update('tableNumber', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : undefined)" />
                </div>
              </div>

              <div v-if="editingId">
                <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <select :value="form.status" class="input-field" @change="update('status', ($event.target as HTMLSelectElement).value as AppointmentStatus)">
                  <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <textarea
                  :value="form.notes"
                  rows="2"
                  maxlength="500"
                  placeholder="Alergias, preferencias especiales..."
                  class="input-field resize-none"
                  @input="update('notes', ($event.target as HTMLTextAreaElement).value)"
                />
              </div>

              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
                <button type="submit" class="btn-primary flex-1" :disabled="saving">
                  {{ saving ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Reserva') }}
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
import { STATUS_LABELS, type AppointmentStatus } from '~/composables/commerce/useAppointments'

export interface AppointmentFormData {
  customerName: string
  customerPhone: string
  date: string
  time: string
  partySize: number
  tableNumber: number | undefined
  notes: string
  status: AppointmentStatus
}

const props = defineProps<{
  show: boolean
  editingId: string | null
  saving: boolean
  form: AppointmentFormData
}>()

const emit = defineEmits<{
  close: []
  submit: []
  'update:form': [form: AppointmentFormData]
}>()

function update<K extends keyof AppointmentFormData>(key: K, value: AppointmentFormData[K]) {
  emit('update:form', { ...props.form, [key]: value })
}
</script>
