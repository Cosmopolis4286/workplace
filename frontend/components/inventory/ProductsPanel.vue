<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-gray-900">
        Productos
        <span class="ml-2 text-sm text-gray-400 font-normal">({{ products.length }})</span>
      </h3>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="border rounded-lg p-4 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div class="h-3 bg-gray-200 rounded w-1/2 mb-4" />
        <div class="flex justify-between">
          <div class="h-5 bg-gray-200 rounded w-1/4" />
          <div class="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="products.length === 0" class="text-center py-12 text-gray-400">
      <CubeIcon class="h-12 w-12 mx-auto mb-3 text-gray-300" />
      <p class="text-sm">
        {{ hasAnyProducts ? 'No hay productos que coincidan con los filtros.' : 'No hay productos. Agrega el primero.' }}
      </p>
      <button v-if="!hasAnyProducts" @click="$emit('create')" class="mt-4 btn-primary text-sm">
        Agregar Producto
      </button>
    </div>

    <!-- ── Grid view ────────────────────────────────────────────── -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="product in products"
        :key="product.id"
        class="border rounded-xl p-4 hover:shadow-md transition-all group relative"
        :class="product.stock === 0 ? 'border-red-200 bg-red-50/30' : product.stock <= product.minStock ? 'border-yellow-200 bg-yellow-50/20' : 'border-gray-200'"
      >
        <!-- Status badge -->
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium text-gray-900 truncate mr-2 text-sm">{{ product.name }}</h4>
          <span :class="statusBadgeClass(product.status)" class="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
            {{ statusLabel(product.status) }}
          </span>
        </div>

        <!-- Category + brand -->
        <div class="flex items-center gap-2 mb-3">
          <span
            v-if="product.category"
            class="inline-flex items-center gap-1 text-xs text-gray-500"
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: product.category.color }" />
            {{ product.category.name }}
          </span>
          <span v-if="product.brand" class="text-xs text-gray-400">· {{ product.brand }}</span>
        </div>

        <!-- Price / Cost / Stock -->
        <div class="flex items-end justify-between">
          <div>
            <p class="text-lg font-bold text-gray-900">${{ product.price.toFixed(2) }}</p>
            <p v-if="product.cost" class="text-xs text-gray-400">Costo: ${{ product.cost.toFixed(2) }}</p>
          </div>
          <div class="text-right">
            <!-- Inline stock adjust -->
            <div class="flex items-center gap-1">
              <button
                @click.stop="$emit('adjust-stock', product, -1)"
                :disabled="product.stock === 0 || savingStock[product.id]"
                class="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-colors"
              >−</button>
              <span
                :class="product.stock === 0 ? 'text-red-600' : product.stock <= product.minStock ? 'text-yellow-600' : 'text-gray-700'"
                class="text-sm font-semibold w-8 text-center"
              >{{ product.stock }}</span>
              <button
                @click.stop="$emit('adjust-stock', product, 1)"
                :disabled="savingStock[product.id]"
                class="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-sm font-bold transition-colors"
              >+</button>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">stock (mín {{ product.minStock }})</p>
          </div>
        </div>

        <!-- Actions overlay -->
        <div class="absolute top-3 right-3 hidden group-hover:flex items-center gap-1 bg-white rounded-lg shadow-sm border px-1.5 py-1">
          <button
            @click.stop="$emit('edit', product)"
            class="p-1 text-gray-500 hover:text-blue-600 transition-colors"
            title="Editar"
          >
            <PencilIcon class="h-3.5 w-3.5" />
          </button>
          <button
            @click.stop="$emit('toggle-status', product)"
            class="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
            :title="product.status === 'AVAILABLE' ? 'Deshabilitar' : 'Habilitar'"
          >
            <component :is="product.status === 'AVAILABLE' ? EyeSlashIcon : EyeIcon" class="h-3.5 w-3.5" />
          </button>
          <button
            @click.stop="$emit('delete', product)"
            class="p-1 text-gray-500 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <TrashIcon class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Table view ───────────────────────────────────────────── -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-700">Producto</th>
            <th class="px-4 py-3 text-left font-medium text-gray-700">Categoría</th>
            <th class="px-4 py-3 text-right font-medium text-gray-700">Precio</th>
            <th class="px-4 py-3 text-right font-medium text-gray-700">Costo</th>
            <th class="px-4 py-3 text-center font-medium text-gray-700">Stock</th>
            <th class="px-4 py-3 text-center font-medium text-gray-700">Estado</th>
            <th class="px-4 py-3 text-center font-medium text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">{{ product.name }}</div>
              <div v-if="product.brand" class="text-xs text-gray-400">{{ product.brand }}</div>
            </td>
            <td class="px-4 py-3">
              <div v-if="product.category" class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: product.category.color }" />
                <span class="text-gray-600">{{ product.category.name }}</span>
              </div>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-3 text-right text-gray-900 font-medium">${{ product.price.toFixed(2) }}</td>
            <td class="px-4 py-3 text-right text-gray-500">${{ product.cost.toFixed(2) }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-center gap-1.5">
                <button
                  @click="$emit('adjust-stock', product, -1)"
                  :disabled="product.stock === 0 || savingStock[product.id]"
                  class="w-5 h-5 flex items-center justify-center rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-xs font-bold"
                >−</button>
                <span
                  :class="product.stock === 0 ? 'text-red-600' : product.stock <= product.minStock ? 'text-yellow-600' : 'text-gray-900'"
                  class="w-8 text-center font-semibold"
                >{{ product.stock }}</span>
                <button
                  @click="$emit('adjust-stock', product, 1)"
                  :disabled="savingStock[product.id]"
                  class="w-5 h-5 flex items-center justify-center rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-xs font-bold"
                >+</button>
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span :class="statusBadgeClass(product.status)" class="text-xs font-medium px-2 py-0.5 rounded-full">
                {{ statusLabel(product.status) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-center gap-2">
                <button @click="$emit('edit', product)" class="text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                  <PencilIcon class="h-4 w-4" />
                </button>
                <button @click="$emit('toggle-status', product)" class="text-gray-400 hover:text-indigo-600 transition-colors" :title="product.status === 'AVAILABLE' ? 'Deshabilitar' : 'Habilitar'">
                  <component :is="product.status === 'AVAILABLE' ? EyeSlashIcon : EyeIcon" class="h-4 w-4" />
                </button>
                <button @click="$emit('delete', product)" class="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { CubeIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'

defineProps({
  products: { type: Array, default: () => [] },
  loading: Boolean,
  viewMode: String,
  savingStock: { type: Object, default: () => ({}) },
  hasAnyProducts: Boolean,
  statusLabel: { type: Function, required: true },
  statusBadgeClass: { type: Function, required: true },
})

defineEmits(['create', 'edit', 'delete', 'toggle-status', 'adjust-stock'])
</script>
