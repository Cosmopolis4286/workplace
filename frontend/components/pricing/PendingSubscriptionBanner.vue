<template>
  <section class="max-w-2xl mx-auto py-6">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-8 text-center">
        <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClockIcon class="w-8 h-8 text-yellow-600" />
        </div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">Tu solicitud está en revisión</h2>
        <p class="text-sm text-gray-500 max-w-md mx-auto">
          Tu solicitud para el plan <strong class="text-gray-700">{{ pendingSubscription?.plan?.name }}</strong>
          está pendiente de aprobación por un administrador. Te notificaremos cuando sea revisada.
        </p>
        <span class="badge bg-yellow-100 text-yellow-700 mt-4 inline-block">Pendiente de aprobación</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ClockIcon } from '@heroicons/vue/24/outline'
import type { Subscription } from '~/composables/commerce/usePlans'

defineProps<{
  pendingSubscription: Subscription | null
}>()
</script>
