<template>
  <section id="how" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16 space-y-3">
        <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">{{ t('landing.how.tag') }}</p>
        <h2 class="text-4xl font-black text-gray-900 tracking-tight">{{ t('landing.how.title') }}</h2>
        <p class="text-gray-500 text-lg">{{ t('landing.how.subtitle') }}</p>
      </div>

      <div class="grid md:grid-cols-3 gap-8 relative">
        <!-- Connecting line (desktop): spans between centers of the 3 icon boxes -->
        <div class="hidden md:block absolute top-10 h-px bg-gray-200" style="left: calc(16.67% + 40px); right: calc(16.67% + 40px);"></div>

        <div v-for="(step, i) in resolvedSteps" :key="i" class="flex flex-col items-center text-center space-y-4 relative">
          <div class="w-20 h-20 rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm relative z-10">
            <component :is="step.icon" class="w-8 h-8 text-workplace-red" />
          </div>
          <div class="w-7 h-7 bg-workplace-red text-white rounded-full flex items-center justify-center text-xs font-black -mt-2 shadow-sm">
            {{ i + 1 }}
          </div>
          <div class="space-y-1.5">
            <h3 class="font-bold text-gray-900">{{ step.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </div>

      <div class="text-center mt-12">
        <NuxtLink
          to="/register"
          class="inline-flex items-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150"
        >
          {{ t('landing.how.startNowFree') }}
          <ArrowRightIcon class="w-4 h-4" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRightIcon } from '@heroicons/vue/24/outline'
import type { PublicStep } from '~/composables/admin/useLandingContent'
import { useLandingIcons } from '~/composables/admin/useLandingIcons'

const props = defineProps<{
  steps: PublicStep[]
}>()

const { t } = useI18n()
const { resolveIcon } = useLandingIcons()

const resolvedSteps = computed(() =>
  props.steps.map(s => ({
    icon: resolveIcon(s.icon),
    title: s.title,
    desc: s.desc,
  }))
)
</script>
