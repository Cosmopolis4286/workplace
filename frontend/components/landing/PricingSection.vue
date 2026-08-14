<template>
  <section id="pricing" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16 space-y-3">
        <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">{{ t('landing.pricing.tag') }}</p>
        <h2 class="text-4xl font-black text-gray-900 tracking-tight">{{ t('landing.pricing.title') }}</h2>
        <p class="text-gray-500 text-lg max-w-xl mx-auto">{{ t('landing.pricing.subtitle') }}</p>
      </div>

      <!-- Skeleton while loading -->
      <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="n" class="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm space-y-4 animate-pulse">
          <div class="h-4 w-20 bg-gray-200 rounded"></div>
          <div class="h-8 w-28 bg-gray-200 rounded"></div>
          <div class="space-y-2 pt-2">
            <div class="h-3 bg-gray-100 rounded w-full"></div>
            <div class="h-3 bg-gray-100 rounded w-4/5"></div>
            <div class="h-3 bg-gray-100 rounded w-3/5"></div>
          </div>
          <div class="h-10 bg-gray-100 rounded-xl mt-4"></div>
        </div>
      </div>

      <!-- Empty state (no plans configured yet) -->
      <div v-else-if="plans.length === 0" class="text-center py-12">
        <p class="text-gray-400 text-sm">{{ t('landing.pricing.comingSoon') }}</p>
      </div>

      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="relative bg-white rounded-2xl p-7 border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
          :class="plan.isPopular ? 'border-workplace-red ring-1 ring-workplace-red' : 'border-gray-100'"
        >
          <span
            v-if="plan.isPopular"
            class="absolute -top-3 left-1/2 -translate-x-1/2 bg-workplace-red text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide"
          >
            {{ t('landing.pricing.mostPopular') }}
          </span>

          <p class="text-sm font-bold text-gray-500 uppercase tracking-wide">{{ plan.name }}</p>
          <p class="mt-2">
            <span class="text-3xl font-black text-gray-900">{{ formatPrice(plan.price) }}</span>
            <span v-if="plan.price > 0" class="text-gray-400 text-sm font-medium">{{ t('landing.pricing.perMonth') }}</span>
          </p>
          <p v-if="plan.description" class="text-sm text-gray-500 mt-2 leading-relaxed">{{ plan.description }}</p>

          <ul class="space-y-2.5 mt-5 flex-1">
            <li v-for="feat in plan.features" :key="feat" class="flex items-start gap-2 text-sm text-gray-600">
              <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5] flex-shrink-0 mt-0.5" />
              {{ feat }}
            </li>
          </ul>

          <NuxtLink
            to="/register"
            class="mt-6 inline-flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl transition-all duration-150 text-sm"
            :class="plan.isPopular
              ? 'bg-workplace-red hover:bg-red-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'"
          >
            {{ t('landing.pricing.startNow') }}
            <ArrowRightIcon class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ArrowRightIcon, CheckIcon } from '@heroicons/vue/24/outline'
import type { Plan } from '~/composables/commerce/usePlans'

defineProps<{
  plans: Plan[]
  loading: boolean
  formatPrice: (price: number) => string
}>()

const { t } = useI18n()
</script>
