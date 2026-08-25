<template>
  <div class="flex flex-col gap-1.5">
    <div class="relative rounded-xl overflow-hidden border border-gray-200 h-24 bg-gray-50 flex items-center justify-center">
      <img
        v-if="image && !loadError"
        :src="resolvedSrc"
        :alt="label"
        class="h-full w-full object-cover"
        @error="loadError = true"
      />
      <span v-else class="text-[10px] text-gray-400 text-center px-1">
        {{ loadError ? 'No se pudo cargar' : 'Sin imagen' }}
      </span>

      <div v-if="busy" class="absolute inset-0 bg-white/70 flex items-center justify-center">
        <div class="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>

    <p class="text-[10px] font-medium text-gray-500 text-center">{{ label }}</p>

    <div class="flex gap-1">
      <button
        type="button"
        :disabled="busy"
        class="flex-1 text-[10px] px-1.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        @click="fileInput?.click()"
      >
        Subir
      </button>
      <button
        type="button"
        :disabled="busy"
        class="flex-1 text-[10px] px-1.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        @click="showUrlInput = !showUrlInput"
      >
        URL
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="onFileChange"
    />

    <div v-if="showUrlInput" class="flex gap-1">
      <input
        v-model="urlValue"
        type="url"
        placeholder="https://..."
        class="flex-1 min-w-0 text-[10px] border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400"
        @keydown.enter.prevent="submitUrl"
      />
      <button
        type="button"
        :disabled="busy || !urlValue.trim()"
        class="text-[10px] px-2 py-1 rounded-lg bg-red-500 text-white disabled:opacity-40"
        @click="submitUrl"
      >
        OK
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAssetUrl } from '~/composables/core/useAssetUrl'

const props = defineProps<{
  label: string
  image?: string
  busy?: boolean
}>()

const emit = defineEmits<{
  upload: [file: File]
  'import-url': [url: string]
}>()

const { getAssetUrl } = useAssetUrl()
const fileInput = ref<HTMLInputElement | null>(null)
const showUrlInput = ref(false)
const urlValue = ref('')
const loadError = ref(false)

const resolvedSrc = computed(() => getAssetUrl(props.image) ?? '')

watch(() => props.image, () => { loadError.value = false })

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  emit('upload', file)
  ;(event.target as HTMLInputElement).value = ''
}

function submitUrl() {
  const url = urlValue.value.trim()
  if (!url) return
  emit('import-url', url)
  urlValue.value = ''
  showUrlInput.value = false
}
</script>
