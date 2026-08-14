<template>
  <section class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
    <div class="max-w-4xl mx-auto bg-gradient-to-br from-workplace-red to-red-700 rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden">
      <!-- Decorative circles -->
      <div class="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full"></div>
      <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full"></div>

      <div class="relative space-y-6">
        <div class="space-y-3">
          <h2 class="text-3xl sm:text-4xl font-black text-white">{{ t('landing.ctaBanner.title') }}</h2>
          <p class="text-red-100 text-lg max-w-xl mx-auto">
            {{ t('landing.ctaBanner.subtitle', { count: commerceCountLabel, appName: t('common.appName') }) }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <NuxtLink
            to="/register"
            class="inline-flex items-center justify-center gap-2 bg-white text-workplace-red font-bold px-8 py-3.5 rounded-xl shadow-sm hover:shadow-md hover:bg-red-50 transition-all duration-150 text-base"
          >
            {{ t('landing.ctaBanner.createFreeAccount') }}
            <ArrowRightIcon class="w-4 h-4" />
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/30 transition-all duration-150 text-base"
          >
            {{ t('landing.ctaBanner.alreadyHaveAccount') }}
          </NuxtLink>
        </div>

        <p class="text-red-200 text-sm">{{ t('landing.ctaBanner.footnote') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRightIcon } from '@heroicons/vue/24/outline'
import type { PublicStat } from '~/composables/admin/useLandingContent'

const props = defineProps<{
  stats: PublicStat[]
}>()

const { t } = useI18n()

// Uses stat key for stability (admin can rename labels without breaking this)
const commerceCountLabel = computed(() => {
  const commerceStat = props.stats.find(s => s.key === 'commerces')
  if (!commerceStat) return t('landing.ctaBanner.moreThanFallback')
  // Strip trailing + to avoid "more than 500+" — the phrase already implies "more than"
  const cleanValue = commerceStat.value.replace(/\+$/, '')
  return t('landing.ctaBanner.moreThan', { value: cleanValue })
})
</script>
