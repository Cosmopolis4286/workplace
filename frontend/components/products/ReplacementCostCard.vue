<template>
  <div class="rounded-lg border p-4" :class="borderClass">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-gray-800">Costo de reposición</h4>
      <div class="flex gap-3">
        <button
          type="button"
          class="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          @click="$emit('register-quote')"
        >
          + Cotización
        </button>
        <button
          type="button"
          class="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          @click="$emit('register-purchase')"
        >
          + Registrar compra
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-xs text-gray-400">Calculando…</p>

    <template v-else-if="data">
      <div v-if="!data.hasPurchaseData" class="text-xs text-gray-500">
        Todavía no registraste compras de este producto. Registrá tu próxima compra a un
        proveedor para ver acá cuánto costaría reponerlo hoy vs. lo que tenés cargado como costo.
      </div>

      <div v-else class="space-y-2">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-xs text-gray-400">Margen histórico</p>
            <p class="font-semibold text-gray-700">{{ formatPct(data.marginHistoricalPct) }}</p>
            <p class="text-xs text-gray-400">costo cargado: ${{ data.historicalCost.toFixed(2) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Margen de reposición</p>
            <p class="font-semibold" :class="marginReplacementClass">{{ formatPct(data.marginReplacementPct) }}</p>
            <p class="text-xs text-gray-400">
              últ. compra: ${{ data.lastPurchaseCostUsd?.toFixed(2) }}
              · prom. ({{ data.samplesUsed }}): ${{ data.averageReplacementCostUsd?.toFixed(2) }}
            </p>
          </div>
        </div>

        <p v-if="marginErosion" class="text-xs px-2 py-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
          ⚠️ El margen de reposición ({{ formatPct(data.marginReplacementPct) }}) está por debajo del
          margen histórico ({{ formatPct(data.marginHistoricalPct) }}). Si mantenés este precio, podrías
          no cubrir el costo real de reponer este producto.
        </p>
      </div>
    </template>

    <div v-if="minPrice" class="mt-3 pt-3 border-t border-gray-100">
      <p class="text-xs font-semibold text-gray-600 mb-1">Price Guard</p>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500 text-xs">
          Precio mínimo recomendado (margen {{ minPrice.minMarginPct }}%)
        </span>
        <span class="font-semibold" :class="minPrice.belowMinPrice ? 'text-red-600' : 'text-gray-700'">
          ${{ minPrice.minPrice.toFixed(2) }}
        </span>
      </div>
      <p v-if="minPrice.belowMinPrice" class="text-xs px-2 py-1.5 mt-1 rounded bg-red-50 text-red-700 border border-red-200">
        ⚠️ Tu precio actual (${{ minPrice.currentPrice.toFixed(2) }}) está por debajo del mínimo recomendado.
        Este precio puede impedirte reponer el producto manteniendo tu margen objetivo.
      </p>

      <div class="mt-2 flex items-center gap-2">
        <label class="text-xs text-gray-400">Si el tipo de cambio sube</label>
        <input v-model.number="simulateIncreasePct" type="number" class="input-field w-16 py-1 text-xs" placeholder="10">
        <span class="text-xs text-gray-400">%</span>
        <button type="button" class="text-xs font-medium text-indigo-600 hover:text-indigo-800" @click="runSimulation">
          Simular
        </button>
      </div>
      <p v-if="simulation" class="text-xs mt-1" :class="simulation.belowSimulatedMinPrice ? 'text-red-600' : 'text-gray-500'">
        Nuevo costo: ${{ simulation.simulatedCostUsd.toFixed(2) }} · nuevo mínimo: ${{ simulation.simulatedMinPrice.toFixed(2) }}
        · margen resultante: {{ formatPct(simulation.simulatedMarginPct) }}
      </p>
    </div>

    <div v-if="comparison && comparison.quotes.length >= 2" class="mt-3 pt-3 border-t border-gray-100">
      <p class="text-xs font-semibold text-gray-600 mb-2">Cotizaciones de proveedores</p>
      <ul class="space-y-1">
        <li
          v-for="quote in comparison.quotes"
          :key="quote.supplierId"
          class="flex items-center justify-between text-xs"
          :class="quote.supplierId === comparison.cheapestSupplierId ? 'text-green-700 font-medium' : 'text-gray-600'"
        >
          <span>
            {{ quote.supplierName }}
            <span v-if="quote.supplierId === comparison.cheapestSupplierId">✓ más barato</span>
          </span>
          <span>
            ${{ quote.priceUsd.toFixed(2) }}
            <span v-if="quote.leadTimeDays !== null" class="text-gray-400">· {{ quote.leadTimeDays }}d entrega</span>
            <span v-if="quote.priceChangePct !== null" :class="quote.priceChangePct > 0 ? 'text-red-500' : 'text-gray-400'">
              ({{ quote.priceChangePct > 0 ? '+' : '' }}{{ quote.priceChangePct }}% en {{ quote.priceChangeLookbackDays }}d)
            </span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePurchases, type ReplacementCost } from '~/composables/commerce/usePurchases'
import { useSuppliers, type SupplierQuoteComparison } from '~/composables/commerce/useSuppliers'
import { usePriceGuard, type MinPriceResult, type PriceSimulationResult } from '~/composables/commerce/usePriceGuard'

const props = defineProps<{ productId: string }>()
defineEmits(['register-purchase', 'register-quote'])

const { getReplacementCost } = usePurchases()
const { compareForProduct } = useSuppliers()
const { getMinPrice, simulatePriceChange } = usePriceGuard()

const data = ref<ReplacementCost | null>(null)
const comparison = ref<SupplierQuoteComparison | null>(null)
const minPrice = ref<MinPriceResult | null>(null)
const loading = ref(false)

const simulateIncreasePct = ref<number | null>(null)
const simulation = ref<PriceSimulationResult | null>(null)

async function load() {
  if (!props.productId) return
  loading.value = true
  simulation.value = null
  const [replacementCost, quoteComparison, minPriceResult] = await Promise.all([
    getReplacementCost(props.productId),
    compareForProduct(props.productId),
    getMinPrice(props.productId),
  ])
  data.value = replacementCost
  comparison.value = quoteComparison
  minPrice.value = minPriceResult
  loading.value = false
}

async function runSimulation() {
  if (simulateIncreasePct.value === null) return
  simulation.value = await simulatePriceChange(props.productId, simulateIncreasePct.value)
}

defineExpose({ reload: load })

onMounted(load)
watch(() => props.productId, load)

// Margen de reposición al menos 5 puntos porcentuales por debajo del
// histórico — umbral simple para la primera alerta visual (MARGIN_DROP),
// ver WORKPLACE_VISION.md sección 4/21.
const marginErosion = computed(() => {
  if (!data.value?.hasPurchaseData) return false
  const { marginHistoricalPct, marginReplacementPct } = data.value
  if (marginHistoricalPct === null || marginReplacementPct === null) return false
  return marginReplacementPct < marginHistoricalPct - 5
})

const marginReplacementClass = computed(() => (marginErosion.value ? 'text-amber-600' : 'text-gray-700'))
const borderClass = computed(() => (marginErosion.value ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'))

function formatPct(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)}%`
}
</script>
