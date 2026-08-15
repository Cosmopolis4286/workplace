<template>
  <div>
    <PageHeader
      title="Mis Pedidos"
      description="Historial de tus compras y pedidos"
      :icon="ShoppingBagIcon"
      :breadcrumb="[{ label: 'Mis Pedidos' }]"
      :stats="headerStats"
    />

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Toggle origen: pedidos de comida (menú de comercio) vs. pedidos del marketplace de catálogo -->
    <div class="card p-1 flex gap-1 mb-4 w-fit">
      <button
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="activeSource === 'food' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
        @click="activeSource = 'food'"
      >
        Comida
      </button>
      <button
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="activeSource === 'catalog' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
        @click="activeSource = 'catalog'"
      >
        Catálogo
      </button>
    </div>

    <CatalogOrdersView v-show="activeSource === 'catalog'" :active="activeSource === 'catalog'" />

    <FoodOrdersView
      v-show="activeSource === 'food'"
      :orders="orders"
      :total="total"
      :stats="stats"
      :loading="loading"
      :loading-more="loadingMore"
      @load-more="loadMore"
      @report="openOrderReport"
    />

    <ReportProblemModal
      v-if="orderForReport"
      v-model="showOrderReportModal"
      entity-type="ORDER"
      :entity-id="orderForReport.id"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { ShoppingBagIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import ReportProblemModal from '~/components/modals/ReportProblemModal.vue'
import CatalogOrdersView from '~/components/my-orders/CatalogOrdersView.vue'
import FoodOrdersView, { type FoodOrder, type MyOrdersStats } from '~/components/my-orders/FoodOrdersView.vue'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

// ─── Toggle de origen ───────────────────────────────────────────────────────────
const activeSource = ref<'food' | 'catalog'>('food')

const orderForReport = ref<FoodOrder | null>(null)
const showOrderReportModal = ref(false)

function openOrderReport(order: FoodOrder) {
  orderForReport.value = order
  showOrderReportModal.value = true
}

// ─── Estado (pedidos de comida) ─────────────────────────────────────────────────
const orders      = ref<FoodOrder[]>([])
const total       = ref(0)
const page        = ref(1)
const limit       = 20
const loading     = ref(false)
const loadingMore = ref(false)
const error       = ref<string | null>(null)
const stats       = ref<MyOrdersStats | null>(null)

const headerStats = computed(() => [
  { label: 'Total',      value: String(stats.value?.totalOrders ?? total.value) },
  { label: 'Pendientes', value: String(stats.value?.pendingOrders ?? 0) },
  { label: 'En Proceso', value: String(stats.value?.processingOrders ?? 0) },
  { label: 'Entregados', value: String(stats.value?.completedOrders ?? 0) },
])

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchOrders() {
  loading.value = true
  error.value   = null
  page.value    = 1
  try {
    const { get } = useApi()
    const res = await get<{ data: FoodOrder[]; total: number }>(`/orders/mine?page=1&limit=${limit}`)
    orders.value = res.data
    total.value  = res.total
  } catch (e: any) {
    error.value = getApiErrorMessage(e, 'Error al cargar pedidos')
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    const nextPage = page.value + 1
    const { get } = useApi()
    const res = await get<{ data: FoodOrder[]; total: number }>(`/orders/mine?page=${nextPage}&limit=${limit}`)
    orders.value = [...orders.value, ...res.data]
    total.value  = res.total
    page.value   = nextPage
  } catch (e: any) {
    error.value = getApiErrorMessage(e, 'Error al cargar más pedidos')
  } finally {
    loadingMore.value = false
  }
}

async function fetchStats() {
  try {
    const { get } = useApi()
    stats.value = await get<MyOrdersStats>('/orders/stats/mine')
  } catch {
    // non-critical
  }
}

onMounted(() => {
  fetchOrders()
  fetchStats()
})
</script>
