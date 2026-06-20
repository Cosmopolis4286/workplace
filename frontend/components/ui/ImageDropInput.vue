<template>
  <div>
    <label class="block text-xs font-medium text-gray-700 mb-1">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <label
      class="relative flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden"
      :class="previewUrl ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-workplace-red/40 hover:bg-red-50/30'"
    >
      <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onChange" />

      <template v-if="previewUrl">
        <img :src="previewUrl" alt="" class="absolute inset-0 w-full h-full object-cover" />
        <button
          type="button"
          class="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-lg text-gray-500 hover:text-red-600 shadow-sm"
          @click.prevent.stop="clear"
        >
          <XMarkIcon class="h-3.5 w-3.5" />
        </button>
      </template>
      <template v-else>
        <CameraIcon class="h-6 w-6 text-gray-400 mb-1" />
        <span class="text-[11px] text-gray-400 text-center px-2">Toca para subir</span>
      </template>
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { CameraIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  modelValue: File | null
  label: string
  required?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [file: File | null] }>()

const previewUrl = ref<string | null>(null)

function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null
  emit('update:modelValue', file)
}

function clear() {
  emit('update:modelValue', null)
}

watch(
  () => props.modelValue,
  (file) => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = file ? URL.createObjectURL(file) : null
  },
)

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>
