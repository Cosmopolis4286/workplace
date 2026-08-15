<template>
  <div class="border-2 border-gray-100 rounded-xl p-3 space-y-2.5">
    <div class="flex items-center justify-between">
      <span class="text-xs font-bold text-gray-600">Ítem {{ index + 1 }}</span>
      <button type="button" class="text-[11px] text-red-500 hover:text-red-700 font-semibold" @click="$emit('remove')">
        Quitar
      </button>
    </div>

    <div v-if="fieldNames.length" class="grid grid-cols-2 gap-2">
      <input
        v-for="fieldName in fieldNames" :key="fieldName"
        :value="item.fields[fieldName]"
        type="text"
        :placeholder="fieldName"
        class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        @input="$emit('update:field', fieldName, ($event.target as HTMLInputElement).value)"
      />
    </div>

    <textarea
      :value="item.notes"
      placeholder="Notas de este ítem (opcional)"
      maxlength="300"
      rows="2"
      class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
      @input="$emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
    />

    <!-- Fotos -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[11px] font-semibold text-gray-500">Fotos ({{ item.photoFiles.length }}/{{ MAX_PHOTOS_PER_ITEM }})</span>
        <label class="text-[11px] text-blue-600 font-semibold cursor-pointer hover:text-blue-700">
          + Agregar
          <input type="file" accept="image/*" multiple class="hidden" @change="$emit('photos-selected', $event)" />
        </label>
      </div>
      <div v-if="item.photoFiles.length" class="grid grid-cols-6 gap-1.5">
        <div v-for="(file, fi) in item.photoFiles" :key="fi" class="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
          <img :src="previewUrl(file)" class="w-full h-full object-cover" />
          <button type="button" class="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center" @click="$emit('remove-photo', fi)">
            <XMarkIcon class="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      </div>
    </div>

    <!-- Videos -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-[11px] font-semibold text-gray-500">Videos ({{ item.videoFiles.length }}/{{ MAX_VIDEOS_PER_ITEM }}, máx 2 min)</span>
        <label class="text-[11px] text-blue-600 font-semibold cursor-pointer hover:text-blue-700">
          + Agregar
          <input type="file" accept="video/*" multiple class="hidden" @change="$emit('videos-selected', $event)" />
        </label>
      </div>
      <div v-if="item.videoFiles.length" class="grid grid-cols-3 gap-1.5">
        <div v-for="(file, fi) in item.videoFiles" :key="fi" class="relative rounded-lg overflow-hidden bg-gray-100">
          <video :src="previewUrl(file)" class="w-full h-16 object-cover" />
          <button type="button" class="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center" @click="$emit('remove-video', fi)">
            <XMarkIcon class="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-[11px] text-red-500">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import {
  MAX_PHOTOS_PER_ITEM,
  MAX_VIDEOS_PER_ITEM,
  type ServiceRequestItemForm,
} from '~/composables/services/useServiceRequestItems'

defineProps<{
  item: ServiceRequestItemForm
  index: number
  fieldNames: string[]
  error?: string
}>()

defineEmits<{
  remove: []
  'update:field': [fieldName: string, value: string]
  'update:notes': [value: string]
  'photos-selected': [event: Event]
  'videos-selected': [event: Event]
  'remove-photo': [fileIdx: number]
  'remove-video': [fileIdx: number]
}>()

function previewUrl(file: File) {
  return URL.createObjectURL(file)
}
</script>
