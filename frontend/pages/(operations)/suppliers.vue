<template>
  <div>
    <PageHeader
      title="Proveedores"
      description="Directorio de proveedores y comparación de cotizaciones"
      :icon="TruckIcon"
      :breadcrumb="breadcrumbItems"
    >
      <template #actions>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="showSupplierModal = true">
          Nuevo proveedor
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

      <div v-else-if="suppliers.length === 0" class="p-12 text-center">
        <TruckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No hay proveedores registrados</p>
        <button class="btn-primary mt-4 text-sm" @click="showSupplierModal = true">Registrar el primero</button>
      </div>

      <div v-else v-for="supplier in suppliers" :key="supplier.id" class="p-4 flex items-center gap-4 hover:bg-gray-50">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-900 truncate">{{ supplier.name }}</p>
          <p class="text-sm text-gray-500">
            {{ supplier.contactName || 'Sin contacto' }}
            <span v-if="supplier.phone"> · {{ supplier.phone }}</span>
          </p>
        </div>
        <span class="badge" :class="supplier.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'">
          {{ supplier.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
        </span>
      </div>
    </div>

    <p class="text-xs text-gray-400 mt-3">
      Para cargar cotizaciones o comparar precios de un producto, entrá a ese producto desde el catálogo.
    </p>

    <SupplierModal :is-open="showSupplierModal" @close="showSupplierModal = false" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, onMounted } from 'vue'
import { TruckIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import SupplierModal from '~/components/modals/SupplierModal.vue'
import { useSuppliers } from '~/composables/commerce/useSuppliers'

const { suppliers, loading, error, loadSuppliers } = useSuppliers()

const showSupplierModal = ref(false)

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Proveedores' },
]

onMounted(loadSuppliers)
</script>

<style scoped>
.badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
.skeleton { @apply bg-gray-200 animate-pulse; }
</style>
