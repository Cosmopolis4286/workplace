<template>
  <div v-if="!loading && purchasingPower && purchasingPower.hasData" class="card p-5 mb-6" :class="borderClass">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <span class="text-2xl">{{ emoji }}</span>
        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Poder adquisitivo (30 días)</p>
          <p class="text-lg font-bold" :class="textClass">
            {{ changeLabel }}
            <span class="text-sm font-medium text-gray-400 ml-1">para reponer lo que solés comprar</span>
          </p>
        </div>
      </div>

      <button
        class="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Ocultar detalle' : 'Ver detalle' }}
      </button>
    </div>

    <p class="text-xs text-gray-400 mt-2">
      Tu capital nominal se mantuvo, pero el costo de reponer la misma cesta de
      {{ purchasingPower.basketSize }} producto{{ purchasingPower.basketSize === 1 ? '' : 's' }} que comprás
      pasó de ${{ purchasingPower.valueAtPreviousPrices?.toFixed(2) }} a ${{ purchasingPower.valueAtCurrentPrices?.toFixed(2) }}.
    </p>

    <div v-if="expanded" class="mt-4 pt-4 border-t border-gray-100 space-y-2">
      <div v-for="item in purchasingPower.basket" :key="item.productId" class="flex items-center justify-between text-xs">
        <span class="text-gray-700">{{ item.productName }}</span>
        <span class="text-gray-500">
          ${{ item.previousUnitCostUsd.toFixed(2) }} → ${{ item.currentUnitCostUsd.toFixed(2) }}
          <span v-if="item.changePct !== null" :class="item.changePct > 0 ? 'text-red-500' : 'text-green-600'">
            ({{ item.changePct > 0 ? '+' : '' }}{{ item.changePct }}%)
          </span>
        </span>
      </div>
    </div>
  </div>

  <div v-else-if="!loading && purchasingPower && !purchasingPower.hasData" class="text-xs text-gray-400 mb-6">
    {{ purchasingPower.reason }}
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePurchasingPower } from '~/composables/commerce/usePurchasingPower'

const { purchasingPower, loading, loadPurchasingPower } = usePurchasingPower()
const expanded = ref(false)

onMounted(loadPurchasingPower)

const changePct = computed(() => purchasingPower.value?.purchasingPowerChangePct ?? 0)

const changeLabel = computed(() => {
  const pct = changePct.value
  if (pct === 0) return 'Sin variación'
  return `${pct > 0 ? '+' : ''}${pct}%`
})

const emoji = computed(() => {
  const pct = changePct.value
  if (pct > 15) return '🔴'
  if (pct > 5) return '🟠'
  if (pct > 0) return '🟡'
  return '🟢'
})

const textClass = computed(() => {
  const pct = changePct.value
  if (pct > 15) return 'text-red-700'
  if (pct > 5) return 'text-orange-700'
  if (pct > 0) return 'text-yellow-700'
  return 'text-green-700'
})

const borderClass = computed(() => {
  const pct = changePct.value
  if (pct > 15) return 'border-l-4 border-l-red-400'
  if (pct > 5) return 'border-l-4 border-l-orange-400'
  return ''
})
</script>
