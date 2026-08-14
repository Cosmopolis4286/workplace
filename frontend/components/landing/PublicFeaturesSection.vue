<template>
  <section id="features" class="py-24 px-4 sm:px-6 lg:px-8" :class="{ 'js-ready': jsReady }">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-16 space-y-3">
        <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">{{ t('landing.features.tag') }}</p>
        <h2 class="text-4xl font-black text-gray-900 tracking-tight">{{ t('landing.features.title') }}</h2>
        <p class="text-gray-500 text-lg max-w-xl mx-auto">{{ t('landing.features.subtitle') }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="(feature, idx) in resolvedFeatures"
          :key="feature.title"
          class="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 hover:-translate-y-1 transition-all duration-200 cursor-default feature-card"
          :data-index="idx"
        >
          <div :class="['w-11 h-11 rounded-xl flex items-center justify-center mb-5', feature.bg]">
            <component :is="feature.icon" class="w-5 h-5 text-white" />
          </div>
          <h3 class="font-bold text-gray-900 mb-2">{{ feature.title }}</h3>
          <p class="text-gray-500 text-sm leading-relaxed">{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import type { PublicFeature } from '~/composables/admin/useLandingContent'
import { useLandingIcons } from '~/composables/admin/useLandingIcons'

const props = defineProps<{
  features: PublicFeature[]
}>()

const { resolveIcon } = useLandingIcons()

const resolvedFeatures = computed(() =>
  props.features.map(f => ({
    title: f.title,
    description: f.description,
    icon: resolveIcon(f.icon),
    bg: f.bg,
  }))
)

// JS-ready flag (prevents feature cards being invisible without JS)
const jsReady = ref(false)

onMounted(async () => {
  jsReady.value = true
  await nextTick()

  // IntersectionObserver for feature card scroll-in animations
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const idx = Number(el.dataset.index ?? 0)
            setTimeout(() => {
              el.classList.add('feature-visible')
            }, idx * 80)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )
    document.querySelectorAll('.feature-card').forEach(el => observer.observe(el))
  }
})
</script>

<style scoped>
/* Feature card scroll-in animation — only hide when JS is active (noscript/bots see cards normally) */
.js-ready .feature-card {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.js-ready .feature-card.feature-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
