<template>
  <div class="p-6 max-w-5xl mx-auto space-y-8">

    <!-- Header -->
    <PageHeader
      title="Contenido de la Landing"
      description="Gestiona estadísticas, testimonios, funciones y pasos que se muestran en la página principal."
      :icon="HomeIcon"
      :breadcrumb="[{ label: 'Landing' }]"
      :stats="headerStats"
    />

    <!-- Error banner -->
    <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <LandingStatsSection @error="error = $event" />

    <ReportedReviewsSection @error="error = $event" @count="reportedReviewsCount = $event" />

    <UserReportsSection @error="error = $event" @count="userReportsCount = $event" />

    <TestimonialsSection @error="error = $event" @count="testimonialsCount = $event" />

    <FeaturesSection @error="error = $event" @count="featuresCount = $event" />

    <StepsSection @error="error = $event" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { HomeIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import LandingStatsSection from '~/components/admin/landing/LandingStatsSection.vue'
import ReportedReviewsSection from '~/components/admin/landing/ReportedReviewsSection.vue'
import UserReportsSection from '~/components/admin/landing/UserReportsSection.vue'
import TestimonialsSection from '~/components/admin/landing/TestimonialsSection.vue'
import FeaturesSection from '~/components/admin/landing/FeaturesSection.vue'
import StepsSection from '~/components/admin/landing/StepsSection.vue'

definePageMeta({ middleware: ['auth'] })

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts (ADMIN_ONLY_ROUTES)

// Banner de error único para la página: cada sección emite su propio error;
// el último en emitir gana (mismo comportamiento que antes, cuando un solo
// computed agregaba los errores de las 5 secciones).
const error = ref<string | null>(null)

// ─── Header stats ─────────────────────────────────────────────────────────────
const testimonialsCount = ref(0)
const featuresCount = ref(0)
const reportedReviewsCount = ref(0)
const userReportsCount = ref(0)

const headerStats = computed(() => [
  { label: 'Testimonios', value: testimonialsCount.value },
  { label: 'Funciones', value: featuresCount.value },
  { label: 'Reseñas reportadas', value: reportedReviewsCount.value },
  { label: 'Reportes de usuarios', value: userReportsCount.value },
])
</script>
