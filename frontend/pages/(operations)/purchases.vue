<template>
  <div>
    <PageHeader
      title="Compras"
      description="Historial de compras a proveedores y reporte de márgenes — Business Shield"
      :icon="ShoppingCartIcon"
      :breadcrumb="breadcrumbItems"
    >
      <template #actions>
        <HeaderActionButton
          v-if="activeTab === 'margins'"
          :icon="ArrowDownTrayIcon"
          :disabled="marginReport.length === 0"
          @click="exportMarginReport"
        >
          Exportar
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="showProductPicker = true">
          Registrar compra
        </HeaderActionButton>
      </template>
    </PageHeader>

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-4 border-b border-gray-200">
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'history' ? 'border-workplace-red text-workplace-red' : 'border-transparent text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'history'"
      >
        Historial
      </button>
      <button
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === 'margins' ? 'border-workplace-red text-workplace-red' : 'border-transparent text-gray-500 hover:text-gray-700'"
        @click="onOpenMarginsTab"
      >
        Reporte de Márgenes
      </button>
    </div>

    <!-- ─── Historial ─────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'history'" class="card divide-y divide-gray-100">
      <div v-if="loading" class="p-4 space-y-3">
        <div v-for="i in 3" :key="i" class="skeleton h-10 rounded" />
      </div>

      <div v-else-if="purchases.length === 0" class="p-12 text-center">
        <ShoppingCartIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No hay compras registradas todavía</p>
        <button class="btn-primary mt-4 text-sm" @click="showProductPicker = true">Registrar la primera</button>
      </div>

      <div v-else v-for="purchase in purchases" :key="purchase.id" class="p-4 flex items-center gap-4 hover:bg-gray-50 group">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-900 truncate">{{ purchase.product?.name ?? 'Producto' }}</p>
          <p class="text-sm text-gray-500">
            {{ formatDate(purchase.purchasedAt) }}
            <span v-if="purchase.supplier"> · {{ purchase.supplier.name }}</span>
            · {{ purchase.quantity }} unid.
          </p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="font-semibold text-gray-900">
            {{ purchase.unitCost.toFixed(2) }} {{ purchase.currencyCode }} / unid.
          </p>
          <p class="text-xs text-gray-400">≈ ${{ purchase.unitCostUsd.toFixed(2) }} USD</p>
        </div>
        <button
          class="p-1.5 rounded hover:bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Eliminar"
          @click="confirmDelete(purchase)"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- ─── Reporte de Márgenes ───────────────────────────────────────────── -->
    <div v-else class="card">
      <div v-if="marginReportLoading" class="p-4 space-y-3">
        <div v-for="i in 3" :key="i" class="skeleton h-10 rounded" />
      </div>

      <div v-else-if="marginReport.length === 0" class="p-12 text-center">
        <ExclamationTriangleIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">Ningún producto con compras registradas todavía</p>
        <p class="text-xs text-gray-400 mt-1">El reporte se arma a partir de los productos que ya tengan al menos una compra.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-900">Producto</th>
              <th class="px-4 py-3 text-right font-medium text-gray-900">Precio</th>
              <th class="px-4 py-3 text-right font-medium text-gray-900">Costo histórico</th>
              <th class="px-4 py-3 text-right font-medium text-gray-900">Costo reposición (USD)</th>
              <th class="px-4 py-3 text-right font-medium text-gray-900">Margen histórico</th>
              <th class="px-4 py-3 text-right font-medium text-gray-900">Margen reposición</th>
              <th class="px-4 py-3 text-right font-medium text-gray-900">Caída</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="row in marginReport" :key="row.productId" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-900 font-medium">{{ row.productName }}</td>
              <td class="px-4 py-3 text-right text-gray-600">${{ row.price.toFixed(2) }}</td>
              <td class="px-4 py-3 text-right text-gray-600">${{ row.historicalCost.toFixed(2) }}</td>
              <td class="px-4 py-3 text-right text-gray-600">${{ row.averageReplacementCostUsd.toFixed(2) }}</td>
              <td class="px-4 py-3 text-right text-gray-600">{{ formatPct(row.marginHistoricalPct) }}</td>
              <td class="px-4 py-3 text-right text-gray-600">{{ formatPct(row.marginReplacementPct) }}</td>
              <td class="px-4 py-3 text-right">
                <span
                  v-if="row.marginDropPct !== null"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="marginDropClass(row.marginDropPct)"
                >
                  {{ row.marginDropPct >= 0 ? '−' : '+' }}{{ Math.abs(row.marginDropPct).toFixed(1) }}pp
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="marginReportTotalPages > 1" class="flex items-center justify-between p-4 border-t">
        <p class="text-sm text-gray-500">{{ marginReportTotal }} productos</p>
        <div class="flex gap-2">
          <button class="btn-secondary text-sm px-3 py-1" :disabled="marginReportPage <= 1" @click="loadMarginReport(marginReportPage - 1)">
            Anterior
          </button>
          <span class="text-sm text-gray-600 px-2 py-1">{{ marginReportPage }} / {{ marginReportTotalPages }}</span>
          <button class="btn-secondary text-sm px-3 py-1" :disabled="marginReportPage >= marginReportTotalPages" @click="loadMarginReport(marginReportPage + 1)">
            Siguiente
          </button>
        </div>
      </div>
    </div>

    <!-- Selector de producto antes de abrir el modal de compra -->
    <TransitionRoot appear :show="showProductPicker" as="template">
      <Dialog as="div" @close="showProductPicker = false" class="relative z-50">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black bg-opacity-25" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
              <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle class="text-lg font-medium text-gray-900 mb-4">¿Qué producto compraste?</DialogTitle>
                <select v-model="pickedProductId" class="input-field mb-4">
                  <option value="" disabled>Seleccionar producto</option>
                  <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
                </select>
                <div class="flex justify-end gap-3">
                  <button type="button" class="btn-secondary" @click="showProductPicker = false">Cancelar</button>
                  <button type="button" class="btn-primary" :disabled="!pickedProductId" @click="openPurchaseModal">
                    Continuar
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <PurchaseModal
      v-if="pickedProductId"
      :is-open="showPurchaseModal"
      :product-id="pickedProductId"
      :product-name="pickedProductName"
      @close="showPurchaseModal = false"
      @saved="onPurchaseSaved"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { ShoppingCartIcon, PlusIcon, XMarkIcon, TrashIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import PurchaseModal from '~/components/modals/PurchaseModal.vue'
import { usePurchases, type Purchase } from '~/composables/commerce/usePurchases'
import { useMenu, type ProductSelectorItem } from '~/composables/catalog/useMenu'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { useDataExport } from '~/composables/core/useDataExport'

const {
  purchases, loading, error, loadPurchases, deletePurchase,
  marginReport, marginReportLoading, marginReportTotal, marginReportPage, marginReportTotalPages, loadMarginReport,
} = usePurchases()
// Selector "¿qué producto compraste?" necesita TODO el catálogo, no una
// página — mismo criterio que el selector de venta en sales.vue.
const { fetchProductsForSelector } = useMenu()
const products = ref<ProductSelectorItem[]>([])
const { formatDate } = useDateFormat()
const { exportCSV } = useDataExport()

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Compras' },
]

type Tab = 'history' | 'margins'
const activeTab = ref<Tab>('history')
let marginReportLoaded = false

function onOpenMarginsTab() {
  activeTab.value = 'margins'
  if (!marginReportLoaded) {
    marginReportLoaded = true
    loadMarginReport()
  }
}

const showProductPicker = ref(false)
const showPurchaseModal = ref(false)
const pickedProductId = ref('')

const pickedProductName = computed(
  () => products.value.find(p => p.id === pickedProductId.value)?.name ?? '',
)

function openPurchaseModal() {
  showProductPicker.value = false
  showPurchaseModal.value = true
}

async function confirmDelete(purchase: Purchase) {
  if (!confirm('¿Eliminar esta compra? El costo de reposición se recalculará sin ella.')) return
  await deletePurchase(purchase.id)
}

// Una compra nueva puede cambiar el margen de reposición del producto — si
// el usuario ya vio el reporte, refrescarlo para no dejarlo desactualizado.
function onPurchaseSaved() {
  loadPurchases()
  if (marginReportLoaded) loadMarginReport(marginReportPage.value)
}

function formatPct(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

function marginDropClass(dropPct: number): string {
  if (dropPct >= 10) return 'bg-red-100 text-red-700'
  if (dropPct >= 5) return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

function exportMarginReport() {
  const rows = marginReport.value.map(r => ({
    Producto: r.productName,
    Precio: r.price.toFixed(2),
    'Costo histórico': r.historicalCost.toFixed(2),
    'Costo reposición (USD)': r.averageReplacementCostUsd.toFixed(2),
    'Margen histórico': formatPct(r.marginHistoricalPct),
    'Margen reposición': formatPct(r.marginReplacementPct),
    'Caída (pp)': r.marginDropPct !== null ? r.marginDropPct.toFixed(1) : '—',
  }))
  exportCSV('reporte-margenes', rows)
}

onMounted(async () => {
  await Promise.all([loadPurchases(), fetchProductsForSelector().then(p => { products.value = p })])
})
</script>

<style scoped>
.skeleton { @apply bg-gray-200 animate-pulse; }
</style>
