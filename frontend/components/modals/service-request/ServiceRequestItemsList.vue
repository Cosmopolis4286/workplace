<template>
  <div v-if="items?.length">
    <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ítems solicitados ({{ items.length }})</p>
    <div class="space-y-2.5">
      <div v-for="(item, idx) in items" :key="item.id" class="border border-gray-100 bg-white rounded-xl p-3.5 shadow-sm">
        <p class="text-[11px] font-semibold text-gray-400 mb-2">Ítem {{ idx + 1 }}</p>
        <div v-if="Object.keys(item.fields ?? {}).length" class="grid grid-cols-2 gap-2.5 mb-2.5">
          <div v-for="[key, value] in Object.entries(item.fields ?? {})" :key="key">
            <p class="text-[10px] text-gray-400 uppercase tracking-wide">{{ key }}</p>
            <p class="text-sm text-gray-900 font-medium">{{ value || '—' }}</p>
          </div>
        </div>
        <p v-if="item.notes" class="text-sm text-gray-600 italic mb-2.5 leading-relaxed">"{{ item.notes }}"</p>
        <div v-if="itemMedia(item).length" class="grid grid-cols-6 gap-1.5">
          <button
            v-for="(media, mi) in itemMedia(item)"
            :key="mi"
            type="button"
            class="group aspect-square rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 relative"
            @click="$emit('open-lightbox', item, mi)"
          >
            <img v-if="media.type === 'photo' && mediaUrl(media.path)" :src="mediaUrl(media.path)" loading="lazy" class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
            <video v-else-if="media.type === 'video' && mediaUrl(media.path)" :src="mediaUrl(media.path)" class="w-full h-full object-cover" />
            <div v-else-if="mediaLoadFailed[media.path]" class="w-full h-full flex items-center justify-center text-gray-300">
              <XCircleIcon class="h-4 w-4" />
            </div>
            <div v-else class="w-full h-full animate-pulse bg-gray-200" />
            <div v-if="media.type === 'video' && mediaUrl(media.path)" class="absolute inset-0 flex items-center justify-center bg-black/20">
              <PlayCircleIcon class="h-6 w-6 text-white" />
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XCircleIcon, PlayCircleIcon } from '@heroicons/vue/24/outline'
import type { MediaEntry } from './MediaLightbox.vue'

interface ServiceRequestItem {
  id: string
  fields: Record<string, string>
  notes?: string
  photos: string[]
  videos: string[]
}

defineProps<{
  items?: ServiceRequestItem[]
  mediaUrl: (path: string) => string | undefined
  mediaLoadFailed: Record<string, boolean>
}>()

defineEmits<{
  'open-lightbox': [item: ServiceRequestItem, index: number]
}>()

function itemMedia(item: ServiceRequestItem): MediaEntry[] {
  return [
    ...(item.photos ?? []).map((path): MediaEntry => ({ type: 'photo', path })),
    ...(item.videos ?? []).map((path): MediaEntry => ({ type: 'video', path })),
  ]
}
</script>
