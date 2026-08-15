<template>
  <div class="px-5 pt-4 pb-3 border-b border-gray-100">
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl overflow-hidden bg-blue-50 flex-shrink-0">
          <img v-if="service?.image" :src="imageSrc(service.image)" :alt="service.name" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
        </div>
        <div>
          <h2 class="text-base font-black text-gray-900 leading-tight">{{ service?.name }}</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ service?.user?.firstName }} {{ service?.user?.lastName }}</p>
          <div class="flex items-center gap-1 mt-1">
            <div class="flex items-center gap-0.5">
              <template v-for="n in 5" :key="n">
                <svg class="w-3 h-3" :class="n <= Math.round(service?.user?.rating ?? 0) ? 'text-amber-400' : 'text-gray-200'" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </template>
            </div>
            <span v-if="service?.user?.rating" class="text-[11px] font-semibold text-gray-600">{{ service.user.rating.toFixed(1) }}</span>
            <span v-else class="text-[11px] text-gray-400">Sin reseñas</span>
            <span v-if="(service?.user?.reviewsCount ?? 0) > 0" class="text-[10px] text-gray-400">({{ service!.user.reviewsCount }})</span>
          </div>
        </div>
      </div>
      <button class="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0" @click="$emit('close')">
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  service: CatalogService | null
  imageSrc: (image: string) => string
}>()

defineEmits<{
  close: []
}>()
</script>
