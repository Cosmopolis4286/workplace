<template>
  <div class="min-h-screen bg-white font-sans">

    <LandingNavbar v-model="mobileMenuOpen" />

    <LandingHero @open-demo="openDemo" />

    <SocialProofStrip :loading="loadingContent" :stats="socialStats" />

    <PublicFeaturesSection :features="dynamicFeatures" />

    <PricingSection :plans="publicPlans" :loading="loadingPlans" :format-price="formatPlanPrice" />

    <HowItWorksSection :steps="dynamicSteps" />

    <PublicTestimonialsSection :testimonials="testimonials" :loading="loadingContent" />

    <CtaBanner :stats="socialStats" />

    <LandingFooter :current-year="currentYear" />

    <DemoModal :show="showDemo" @close="closeDemo" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import LandingNavbar from '~/components/landing/LandingNavbar.vue'
import LandingHero from '~/components/landing/LandingHero.vue'
import SocialProofStrip from '~/components/landing/SocialProofStrip.vue'
import PublicFeaturesSection from '~/components/landing/PublicFeaturesSection.vue'
import PricingSection from '~/components/landing/PricingSection.vue'
import HowItWorksSection from '~/components/landing/HowItWorksSection.vue'
import PublicTestimonialsSection from '~/components/landing/PublicTestimonialsSection.vue'
import CtaBanner from '~/components/landing/CtaBanner.vue'
import LandingFooter from '~/components/landing/LandingFooter.vue'
import DemoModal from '~/components/landing/DemoModal.vue'
import { useLandingContent } from '~/composables/admin/useLandingContent'
import { usePlans } from '~/composables/commerce/usePlans'

definePageMeta({ layout: false })

const { t } = useI18n()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl as string

// ─── Contenido dinámico de la landing (stats, testimonios, features, steps) ──
const {
  stats: socialStats,
  testimonials,
  features: dynamicFeatures,
  steps: dynamicSteps,
  loading: loadingContent,
  load: loadLandingContent,
  connectRealtime: connectLandingRealtime,
  disconnectRealtime: disconnectLandingRealtime,
} = useLandingContent()

// ─── Pricing (planes públicos desde el backend) ──────────────────────────────
const { plans: publicPlans, loading: loadingPlans, fetchPublicPlans, formatPrice: formatPlanPrice } = usePlans()

// ─── SEO ──────────────────────────────────────────────────────────────────────
const ratingCount = computed(() => {
  const ratingStat = socialStats.value.find(s => s.key === 'rating')
  // rawValue is guaranteed to be numeric; never use .value which may contain '4.9★'
  return String(ratingStat?.rawValue ?? 500)
})

useHead(() => ({
  title: t('landing.seo.title'),
  meta: [
    { name: 'description', content: t('landing.seo.description') },
    { name: 'keywords', content: t('landing.seo.keywords') },
    { property: 'og:site_name', content: t('common.appName') },
    { property: 'og:title', content: t('landing.seo.title') },
    { property: 'og:description', content: t('landing.seo.ogDescription') },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: siteUrl },
    { property: 'og:image', content: `${siteUrl}/og-image.png` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: t('common.appName') },
    { name: 'twitter:description', content: t('landing.seo.twitterDescription') },
  ],
  link: [{ rel: 'canonical', href: siteUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: t('common.appName'),
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: t('landing.seo.schemaDescription'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: t('landing.seo.freePlanAvailable'),
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: ratingCount.value,
        },
      }),
    },
  ],
}))

// ─── SSR-safe currentYear ─────────────────────────────────────────────────────
const currentYear = useState('currentYear', () => new Date().getFullYear())

// ─── Mobile menu ─────────────────────────────────────────────────────────────
const mobileMenuOpen = ref(false)

// ─── Demo modal ───────────────────────────────────────────────────────────────
const showDemo = ref(false)

function openDemo() {
  showDemo.value = true
}
function closeDemo() {
  showDemo.value = false
}

// Escape global: cierra el menú móvil (el demo maneja su propio Escape mientras está abierto)
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && mobileMenuOpen.value) {
    mobileMenuOpen.value = false
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  disconnectLandingRealtime()
})

// ─── Dynamic landing content ──────────────────────────────────────────────────
onMounted(() => {
  loadLandingContent()
  fetchPublicPlans()
  connectLandingRealtime()
  window.addEventListener('keydown', handleKeydown)
})
</script>
