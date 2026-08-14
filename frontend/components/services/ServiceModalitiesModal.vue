<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-gray-900">Gestionar Modalidades</h2>
          <button @click="$emit('close')" class="p-1 text-gray-400 hover:text-gray-600">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {{ error }}
        </div>

        <!-- Nueva modalidad -->
        <div class="mb-6 p-4 bg-gray-50 rounded-xl">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Nueva Modalidad</h3>
          <div class="grid grid-cols-4 gap-3">
            <input
              v-model="newModality.name"
              type="text"
              placeholder="Nombre (ej: Presencial)"
              class="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <input
              v-model="newModality.value"
              type="text"
              placeholder="Valor (ej: IN_PERSON)"
              class="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <input
              v-model="newModality.emoji"
              type="text"
              placeholder="Emoji (ej: 📍)"
              maxlength="2"
              class="col-span-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <button
              @click="$emit('add', { ...newModality })"
              :disabled="!newModality.name || !newModality.value"
              class="col-span-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Agregar
            </button>
          </div>
        </div>

        <!-- Lista de modalidades -->
        <div class="space-y-2">
          <div
            v-for="modality in modalities"
            :key="modality.id"
            class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ modality.emoji || '📋' }}</span>
              <div>
                <p class="font-medium text-gray-900">{{ modality.name }}</p>
                <p class="text-xs text-gray-500">{{ modality.value }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="$emit('toggle-active', modality)"
                class="px-2 py-1 text-xs font-medium rounded"
                :class="modality.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
              >
                {{ modality.isActive ? 'Activo' : 'Inactivo' }}
              </button>
              <button
                @click="$emit('delete', modality)"
                class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <p class="mt-4 text-xs text-gray-500">
          Las modalidades activas aparecerán en el formulario de solicitud de servicios.
        </p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { XMarkIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { ServiceModality } from '~/composables/services/useMyServices'

const props = defineProps<{
  show: boolean
  modalities: ServiceModality[]
  error: string | null
}>()

defineEmits<{
  close: []
  add: [modality: { name: string; value: string; emoji: string }]
  'toggle-active': [modality: ServiceModality]
  delete: [modality: ServiceModality]
}>()

const newModality = ref({ name: '', value: '', emoji: '' })

watch(() => props.show, (visible) => {
  if (visible) newModality.value = { name: '', value: '', emoji: '' }
})
</script>
