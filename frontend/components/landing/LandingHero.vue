<template>
  <section class="pt-28 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
    <!-- Background blobs -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div class="absolute -top-40 right-0 w-[600px] h-[600px] bg-gradient-to-br from-red-50 via-red-100/50 to-transparent rounded-full blur-3xl opacity-60"></div>
      <div class="absolute bottom-0 -left-20 w-96 h-96 bg-gradient-to-tr from-orange-50 to-transparent rounded-full blur-3xl opacity-40"></div>
    </div>

    <div class="max-w-7xl mx-auto relative">
      <div class="grid lg:grid-cols-2 gap-12 items-center">
        <!-- Text -->
        <div class="space-y-8">
          <div class="space-y-4">
            <div class="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-workplace-red text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
              <span class="w-1.5 h-1.5 bg-workplace-red rounded-full animate-pulse"></span>
              {{ t('landing.hero.badge') }}
            </div>
            <h1 class="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight">
              {{ t('landing.hero.titleLine1') }}<br/>
              {{ t('landing.hero.titleLine2') }}<br/>
              <span class="text-workplace-red">{{ t('landing.hero.titleHighlight') }}</span>
            </h1>
            <p class="text-lg text-gray-500 leading-relaxed max-w-lg">
              {{ t('landing.hero.description') }}
            </p>
          </div>

          <!-- CTA buttons -->
          <div class="flex flex-col sm:flex-row gap-3">
            <NuxtLink
              to="/register"
              class="inline-flex items-center justify-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-7 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 text-base"
            >
              {{ t('landing.hero.createFreeAccount') }}
              <ArrowRightIcon class="w-4 h-4" />
            </NuxtLink>
            <button
              type="button"
              :aria-label="t('landing.hero.viewDemoAria')"
              class="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-7 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 text-base"
              @click="$emit('open-demo')"
            >
              <PlayIcon class="w-4 h-4 text-workplace-red" />
              {{ t('landing.hero.viewDemo') }}
            </button>
          </div>

          <!-- Trust badges -->
          <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400">
            <span class="flex items-center gap-1.5">
              <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
              {{ t('landing.hero.noCreditCard') }}
            </span>
            <span class="flex items-center gap-1.5">
              <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
              {{ t('landing.hero.setupIn5Min') }}
            </span>
            <span class="flex items-center gap-1.5">
              <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
              {{ t('landing.hero.support247') }}
            </span>
          </div>
        </div>

        <!-- Stats panel (mock dashboard preview) -->
        <div class="relative hidden lg:block">
          <!-- Main card -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-5">
            <!-- Header -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-gray-400 font-medium">{{ t('landing.hero.panelTitle') }}</p>
                <p class="font-black text-gray-900 text-lg">{{ t('landing.hero.panelRestaurant') }}</p>
              </div>
              <div class="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                {{ t('landing.hero.online') }}
              </div>
            </div>

            <!-- KPI row -->
            <div class="grid grid-cols-3 gap-3">
              <div v-for="kpi in heroKpis" :key="kpi.label" class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p class="text-xs text-gray-400 mb-1">{{ kpi.label }}</p>
                <p class="font-black text-gray-900 text-xl">{{ kpi.value }}</p>
                <p class="text-xs font-semibold mt-1" :class="kpi.trend > 0 ? 'text-green-500' : 'text-red-500'">
                  {{ kpi.trend > 0 ? '↑' : '↓' }} {{ Math.abs(kpi.trend) }}%
                </p>
              </div>
            </div>

            <!-- Mini bar chart (animated on mount) -->
            <div>
              <p class="text-xs text-gray-400 font-medium mb-3">{{ t('landing.hero.revenueThisWeek') }}</p>
              <div class="flex items-end gap-1.5 h-16">
                <div
                  v-for="(bar, i) in chartBars"
                  :key="i"
                  class="flex-1 rounded-t-md transition-all duration-700 ease-out"
                  :class="i === chartBars.length - 1 ? 'bg-workplace-red' : 'bg-gray-100'"
                  :style="{ height: chartAnimated ? `${bar}%` : '4%', transitionDelay: `${i * 80}ms` }"
                ></div>
              </div>
              <div class="flex justify-between mt-1.5">
                <span v-for="d in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="d" class="text-[10px] text-gray-300 flex-1 text-center">{{ d }}</span>
              </div>
            </div>

            <!-- Recent orders -->
            <div>
              <p class="text-xs text-gray-400 font-medium mb-3">{{ t('landing.hero.recentOrders') }} <span class="text-[10px] text-gray-300 font-normal">{{ t('landing.hero.demoTag') }}</span></p>
              <div class="space-y-2">
                <div v-for="order in heroOrders" :key="order.id" class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {{ order.initials }}
                    </div>
                    <div>
                      <p class="text-xs font-semibold text-gray-700">{{ order.name }}</p>
                      <p class="text-[10px] text-gray-400">{{ order.time }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-900">{{ order.amount }}</span>
                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="order.statusClass">{{ order.status }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Floating badge -->
          <div class="absolute -bottom-5 -left-6 bg-white rounded-xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3">
            <div class="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <ArrowTrendingUpIcon class="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p class="text-xs text-gray-400">{{ t('landing.hero.salesToday') }}</p>
              <p class="text-sm font-black text-gray-900">+$4,280 <span class="text-green-500 font-bold">↑12%</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowRightIcon, PlayIcon, CheckIcon, ArrowTrendingUpIcon } from '@heroicons/vue/24/outline'

defineEmits<{
  'open-demo': []
}>()

const { t } = useI18n()

const chartAnimated = ref(false)
const chartBars = [45, 62, 55, 78, 70, 88, 100]

const heroKpis = computed(() => [
  { label: t('landing.hero.salesToday'), value: '$4.2k', trend: 12 },
  { label: t('landing.hero.kpiOrders'), value: '38', trend: 8 },
  { label: t('landing.hero.kpiCustomers'), value: '124', trend: -3 },
])

const heroOrders = computed(() => [
  { id: 1, initials: 'JG', name: 'Juan García', time: t('landing.hero.minutesAgo', { minutes: 2 }), amount: '$320', status: t('landing.hero.orderStatusNew'), statusClass: 'bg-blue-50 text-blue-600' },
  { id: 2, initials: 'ML', name: 'María López', time: t('landing.hero.minutesAgo', { minutes: 8 }), amount: '$185', status: t('landing.hero.orderStatusPreparing'), statusClass: 'bg-yellow-50 text-yellow-600' },
  { id: 3, initials: 'CR', name: 'Carlos R.', time: t('landing.hero.minutesAgo', { minutes: 15 }), amount: '$560', status: t('landing.hero.orderStatusReady'), statusClass: 'bg-green-50 text-green-600' },
])

onMounted(() => {
  setTimeout(() => { chartAnimated.value = true }, 200)
})
</script>
