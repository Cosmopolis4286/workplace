<template>
  <section id="testimonials" class="py-24 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 space-y-3">
        <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">{{ t('landing.testimonials.tag') }}</p>
        <h2 class="text-4xl font-black text-gray-900 tracking-tight">{{ t('landing.testimonials.title') }}</h2>
      </div>

      <!-- Skeleton while loading -->
      <div v-if="loading" class="grid md:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="n" class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 animate-pulse">
          <div class="flex gap-1">
            <div v-for="s in 5" :key="s" class="w-4 h-4 bg-gray-200 rounded"></div>
          </div>
          <div class="space-y-2">
            <div class="h-3 bg-gray-100 rounded w-full"></div>
            <div class="h-3 bg-gray-100 rounded w-4/5"></div>
            <div class="h-3 bg-gray-100 rounded w-3/5"></div>
          </div>
          <div class="flex items-center gap-3 pt-2 border-t border-gray-50">
            <div class="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0"></div>
            <div class="space-y-1.5">
              <div class="h-3 bg-gray-200 rounded w-24"></div>
              <div class="h-2.5 bg-gray-100 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid md:grid-cols-3 gap-6">
        <div
          v-for="t in testimonials"
          :key="t.name"
          class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
        >
          <!-- Stars -->
          <div class="flex gap-0.5">
            <StarIcon v-for="n in 5" :key="n" class="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
          <p class="text-gray-600 text-sm leading-relaxed italic">"{{ t.quote }}"</p>
          <div class="flex items-center gap-3 pt-2 border-t border-gray-50">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" :style="{ backgroundColor: t.avatarColor }">
              {{ t.initials }}
            </div>
            <div>
              <p class="text-sm font-bold text-gray-900">{{ t.name }}</p>
              <p class="text-xs text-gray-400">
                {{ t.role }}
                <span v-if="t.createdAt"> · {{ formatTestimonialDate(t.createdAt) }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { StarIcon } from '@heroicons/vue/24/solid'
import type { PublicTestimonial } from '~/composables/admin/useLandingContent'

defineProps<{
  testimonials: PublicTestimonial[]
  loading: boolean
}>()

const { t, locale } = useI18n()

function formatTestimonialDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
}
</script>
