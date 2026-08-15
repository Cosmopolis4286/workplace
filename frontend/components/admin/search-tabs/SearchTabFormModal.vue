<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 class="text-lg font-black text-gray-900">{{ editing ? 'Editar Tab' : 'Nuevo Tab' }}</h2>
            <button class="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors" @click="$emit('close')">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <form class="p-6 space-y-5" @submit.prevent="$emit('submit')">
            <!-- Key (only on create) -->
            <div v-if="!editing">
              <label class="block text-xs font-bold text-gray-600 mb-1.5">Key (identificador único) <span class="text-red-500">*</span></label>
              <input
                v-model="form.key"
                type="text"
                placeholder="ej: productos, servicios, marketplace"
                class="input-field"
                required
                pattern="[a-z0-9_-]+"
                title="Solo letras minúsculas, números, guiones y guiones bajos"
              />
              <p class="text-xs text-gray-400 mt-1">Solo letras minúsculas, números, - y _</p>
            </div>

            <!-- Label -->
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1.5">Etiqueta <span class="text-red-500">*</span></label>
              <input
                v-model="form.label"
                type="text"
                placeholder="ej: Productos, Servicios, Empleos"
                class="input-field"
                required
              />
            </div>

            <!-- Color -->
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1.5">Color del tab</label>
              <div class="flex items-center gap-3">
                <input
                  v-model="form.color"
                  type="color"
                  class="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  v-model="form.color"
                  type="text"
                  placeholder="#EF4444"
                  class="flex-1 input-field font-mono"
                />
                <!-- Preview -->
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  :style="{ backgroundColor: form.color || '#EF4444' }"
                >
                  <svg v-if="form.icon" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="form.icon" />
                  </svg>
                  <span v-else class="text-white font-black text-sm">{{ (form.label || 'T')[0] }}</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 mt-2">
                <button
                  v-for="c in presetColors"
                  :key="c"
                  type="button"
                  class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  :class="form.color === c ? 'border-gray-700' : 'border-transparent'"
                  :style="{ backgroundColor: c }"
                  @click="form.color = c"
                />
              </div>
            </div>

            <!-- Icon path (SVG d attribute) -->
            <div>
              <label class="block text-xs font-bold text-gray-600 mb-1.5">Icono SVG (atributo "d" del path)</label>
              <textarea
                v-model="form.icon"
                rows="2"
                placeholder="M4 6a2 2 0 012-2h2..."
                class="input-field text-xs font-mono resize-none"
              />
              <p class="text-xs text-gray-400 mt-1">Pega el valor del atributo <code>d</code> de un SVG 24x24 de Heroicons</p>
            </div>

            <!-- Enabled -->
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p class="text-sm font-bold text-gray-700">Activo</p>
                <p class="text-xs text-gray-400">Visible en la página de búsqueda</p>
              </div>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="form.isEnabled ? 'bg-red-600' : 'bg-gray-200'"
                @click="form.isEnabled = !form.isEnabled"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  :class="form.isEnabled ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- Footer -->
            <div class="flex gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                @click="$emit('close')"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="flex-1 btn-primary disabled:opacity-60 flex items-center justify-center gap-2 py-2.5"
                :disabled="saving"
              >
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear tab') }}
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

export interface SearchTabFormData {
  key: string
  label: string
  icon: string
  color: string
  isEnabled: boolean
}

defineProps<{
  show: boolean
  editing: boolean
  saving: boolean
  form: SearchTabFormData
  presetColors: string[]
}>()

defineEmits<{
  close: []
  submit: []
}>()
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
