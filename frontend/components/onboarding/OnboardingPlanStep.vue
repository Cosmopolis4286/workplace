<template>
  <div class="p-6">
    <h2 class="text-base font-bold text-gray-900 mb-0.5">Elige tu plan</h2>
    <p class="text-sm text-gray-500 mb-5">Puedes cambiarlo en cualquier momento desde tu perfil.</p>

    <div v-if="loading" class="flex justify-center py-10">
      <div class="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else class="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
      <button
        v-for="plan in plans"
        :key="plan.id"
        type="button"
        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all hover:border-red-400/50 active:scale-[0.99]"
        :class="selectedPlan === plan.id
          ? 'border-red-600 bg-red-50 shadow-sm shadow-red-100'
          : 'border-gray-200'"
        @click="$emit('update:selectedPlan', plan.id)"
      >
        <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: plan.color || '#ef4444' }" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-sm text-gray-900">{{ plan.name }}</span>
            <span v-if="plan.isPopular" class="badge bg-red-100 text-red-700">Popular</span>
          </div>
          <p v-if="plan.description" class="text-xs text-gray-500 truncate mt-0.5">{{ plan.description }}</p>
          <ul v-if="plan.features?.length" class="mt-1.5 space-y-0.5">
            <li
              v-for="feature in plan.features.slice(0, 3)"
              :key="feature"
              class="flex items-center gap-1.5 text-xs text-gray-600"
            >
              <CheckIcon class="h-3 w-3 text-green-500 flex-shrink-0" />
              <span class="truncate">{{ feature }}</span>
            </li>
          </ul>
        </div>
        <div class="flex-shrink-0 text-right">
          <span class="font-black text-sm text-gray-900">
            {{ plan.price === 0 ? 'Gratis' : `$${plan.price}/mes` }}
          </span>
        </div>
        <CheckCircleIcon v-if="selectedPlan === plan.id" class="h-4 w-4 text-red-600 flex-shrink-0" />
      </button>

      <!-- Opción omitir plan -->
      <button
        type="button"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all hover:border-gray-300 text-gray-400"
        :class="selectedPlan === '' ? 'border-gray-400 bg-gray-50' : 'border-dashed border-gray-200'"
        @click="$emit('update:selectedPlan', '')"
      >
        <div class="w-3 h-3 rounded-full border-2 border-gray-300 flex-shrink-0" />
        <span class="text-sm font-medium">Continuar sin plan (configurar después)</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, CheckIcon } from '@heroicons/vue/24/outline'

defineProps<{
  loading: boolean
  plans: { id: string; name: string; description?: string; price: number; color: string; isPopular: boolean; features?: string[] }[]
  selectedPlan: string
}>()

defineEmits<{
  'update:selectedPlan': [id: string]
}>()
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
</style>
