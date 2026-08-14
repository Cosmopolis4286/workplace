<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" @click.self="$emit('close')">
      <button class="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" @click="$emit('close')">
        <XMarkIcon class="h-6 w-6" />
      </button>

      <button
        v-if="media.length > 1"
        class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        @click.stop="$emit('prev')"
      >
        <ChevronLeftIcon class="h-6 w-6" />
      </button>
      <button
        v-if="media.length > 1"
        class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        @click.stop="$emit('next')"
      >
        <ChevronRightIcon class="h-6 w-6" />
      </button>

      <div class="max-w-3xl max-h-[85vh] w-full flex flex-col items-center gap-3" @click.stop>
        <img
          v-if="current?.type === 'photo' && mediaUrl(current.path)"
          :src="mediaUrl(current.path)"
          class="max-w-full max-h-[75vh] object-contain rounded-lg"
        />
        <video
          v-else-if="current?.type === 'video' && mediaUrl(current.path)"
          :src="mediaUrl(current.path)"
          controls
          autoplay
          class="max-w-full max-h-[75vh] object-contain rounded-lg"
        />
        <div v-else class="w-64 h-64 flex items-center justify-center text-white/50">
          <XCircleIcon class="h-8 w-8" />
        </div>

        <div v-if="media.length > 1" class="flex items-center gap-1.5">
          <button
            v-for="(m, mi) in media"
            :key="mi"
            type="button"
            class="h-1.5 rounded-full transition-all"
            :class="mi === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'"
            @click.stop="$emit('select', mi)"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, XCircleIcon } from '@heroicons/vue/24/outline'

export interface MediaEntry { type: 'photo' | 'video'; path: string }

const props = defineProps<{
  show: boolean
  media: MediaEntry[]
  index: number
  mediaUrl: (path: string) => string | undefined
}>()

defineEmits<{
  close: []
  prev: []
  next: []
  select: [index: number]
}>()

const current = computed(() => props.media[props.index] ?? null)
</script>
