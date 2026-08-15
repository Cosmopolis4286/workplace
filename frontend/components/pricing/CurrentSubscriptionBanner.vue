<template>
  <div v-if="mySubscription && myPlan" class="mb-6">
    <div
      class="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-l-4"
      :style="{ borderLeftColor: myPlan.color || '#ef4444' }"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" :style="{ backgroundColor: (myPlan.color || '#ef4444') + '15' }">
          <CreditCardIcon class="w-5 h-5" :style="{ color: myPlan.color || '#ef4444' }" />
        </div>
        <div>
          <p class="text-sm text-gray-500">
            Tu plan actual es <strong class="text-gray-900">{{ myPlan.name }}</strong>
            <span v-if="mySubscription.status === 'TRIAL'" class="badge bg-blue-100 text-blue-700 ml-2">Prueba</span>
          </p>
          <p v-if="mySubscription.endAt" class="text-xs mt-0.5" :class="(daysRemaining(mySubscription.endAt) ?? 999) <= 7 ? 'text-red-600 font-semibold' : 'text-gray-400'">
            {{ mySubscription.status === 'TRIAL' ? 'Tu prueba termina' : 'Vence' }} el
            {{ formatDateLong(mySubscription.endAt) }}
            <template v-if="daysRemaining(mySubscription.endAt) !== null">
              ({{ daysRemaining(mySubscription.endAt) }} días restantes)
            </template>
          </p>
        </div>
      </div>
      <NuxtLink to="/my-plan" class="btn-secondary text-sm flex-shrink-0">Ver detalles de mi plan</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CreditCardIcon } from '@heroicons/vue/24/outline'
import type { Subscription, Plan } from '~/composables/commerce/usePlans'

defineProps<{
  mySubscription: Subscription | null
  myPlan: Plan | null
  daysRemaining: (date: string) => number | null
  formatDateLong: (date: string) => string
}>()
</script>
