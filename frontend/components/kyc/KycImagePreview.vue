<template>
  <a
    v-if="blobUrl"
    :href="blobUrl"
    target="_blank"
    rel="noopener"
    class="block relative aspect-square rounded-xl overflow-hidden border border-gray-200 group"
  >
    <img :src="blobUrl" :alt="label" class="w-full h-full object-cover" />
    <span class="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5 group-hover:bg-black/70 transition-colors">
      {{ label }}
    </span>
  </a>
  <div v-else-if="error" class="aspect-square rounded-xl border border-red-200 bg-red-50 flex items-center justify-center text-[10px] text-red-500 text-center px-1">
    Error al cargar
  </div>
  <div v-else class="aspect-square rounded-xl bg-gray-100 animate-pulse" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useKyc } from '~/composables/useKyc'

const props = defineProps<{
  verificationId: string
  field: 'frontImageUrl' | 'backImageUrl' | 'selfieImageUrl'
  label: string
}>()

const { fetchImageBlobUrl } = useKyc()
const blobUrl = ref<string | null>(null)
const error = ref(false)

onMounted(async () => {
  try {
    blobUrl.value = await fetchImageBlobUrl(props.verificationId, props.field)
  } catch {
    error.value = true
  }
})

onBeforeUnmount(() => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})
</script>
