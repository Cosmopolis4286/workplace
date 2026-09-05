<template>
  <div>
    <PageHeader
      title="Compras"
      description="Historial de compras a proveedores — base del costo de reposición (Business Shield)"
      :icon="ShoppingCartIcon"
      :breadcrumb="breadcrumbItems"
    >
      <template #actions>
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

    <div class="card divide-y divide-gray-100">
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
      @saved="loadPurchases()"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { ShoppingCartIcon, PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import PurchaseModal from '~/components/modals/PurchaseModal.vue'
import { usePurchases, type Purchase } from '~/composables/commerce/usePurchases'
import { useMenu } from '~/composables/catalog/useMenu'
import { useDateFormat } from '~/composables/core/useDateFormat'

const { purchases, loading, error, loadPurchases, deletePurchase } = usePurchases()
const { products, loadProducts } = useMenu()
const { formatDate } = useDateFormat()

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Compras' },
]

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

onMounted(async () => {
  await Promise.all([loadPurchases(), loadProducts()])
})
</script>

<style scoped>
.skeleton { @apply bg-gray-200 animate-pulse; }
</style>
