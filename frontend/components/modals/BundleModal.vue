<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-1">
                Nuevo Pack
              </DialogTitle>
              <p class="text-sm text-gray-500 mb-4">Combina productos propios en una sola oferta con su propio precio.</p>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del pack</label>
                    <input v-model="form.name" type="text" required class="input-field" placeholder="Combo Familiar">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select v-model="form.categoryId" required class="input-field">
                      <option value="">Seleccionar categoría</option>
                      <option v-for="category in categories" :key="category.id" :value="category.id">
                        {{ category.name }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Precio del pack (USD)</label>
                    <input v-model.number="form.price" type="number" step="0.01" min="0" required class="input-field" placeholder="0.00">
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea v-model="form.description" rows="2" class="input-field resize-none" placeholder="Qué incluye el pack" />
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="block text-sm font-medium text-gray-700">Componentes del pack</label>
                    <span class="text-xs text-gray-400">Mínimo 2 productos</span>
                  </div>

                  <div v-if="availableProducts.length === 0" class="text-sm text-gray-400 py-4 text-center border-2 border-dashed border-gray-200 rounded-xl">
                    Necesitas al menos 2 productos individuales creados antes de armar un pack.
                  </div>

                  <div v-else class="space-y-2 max-h-64 overflow-y-auto pr-1">
                    <div
                      v-for="product in availableProducts"
                      :key="product.id"
                      class="flex items-center gap-3 p-2.5 border-2 rounded-xl transition-colors"
                      :class="isSelected(product.id) ? 'border-workplace-red/40 bg-red-50/40' : 'border-gray-100'"
                    >
                      <input
                        type="checkbox"
                        :checked="isSelected(product.id)"
                        class="h-4 w-4 rounded text-workplace-red focus:ring-workplace-red"
                        @change="toggleProduct(product.id)"
                      >
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-gray-800 truncate">{{ product.name }}</p>
                        <p class="text-xs text-gray-400">${{ product.price.toFixed(2) }} · stock {{ product.stock }}</p>
                      </div>
                      <input
                        v-if="isSelected(product.id)"
                        v-model.number="selection[product.id]"
                        type="number"
                        min="1"
                        class="w-16 px-2 py-1 text-sm border-2 border-gray-200 rounded-lg text-center"
                      >
                    </div>
                  </div>
                </div>

                <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>

                <div class="flex justify-end gap-3 pt-2">
                  <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary" :disabled="saving">
                    {{ saving ? 'Creando...' : 'Crear Pack' }}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import type { Category, Product, CreateBundlePayload } from '~/composables/catalog/useMenu'

const props = defineProps<{
  isOpen: boolean
  categories: Category[]
  products: Product[]
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: CreateBundlePayload]
}>()

// Un pack no puede tener otro pack como componente (ver MenuService.createBundle).
const availableProducts = computed(() => props.products.filter((p) => !p.isBundle))

function emptyForm() {
  return { name: '', description: '', price: 0, categoryId: '' }
}

const form = ref(emptyForm())
const selection = ref<Record<string, number>>({})
const formError = ref('')

function isSelected(productId: string) {
  return productId in selection.value
}

function toggleProduct(productId: string) {
  const next = { ...selection.value }
  if (productId in next) delete next[productId]
  else next[productId] = 1
  selection.value = next
}

watch(() => props.isOpen, (open) => {
  if (open) {
    form.value = emptyForm()
    selection.value = {}
    formError.value = ''
  }
})

function closeModal() {
  emit('close')
}

function handleSubmit() {
  const items = Object.entries(selection.value).map(([productId, quantity]) => ({ productId, quantity }))
  if (items.length < 2) {
    formError.value = 'Selecciona al menos 2 productos para armar el pack'
    return
  }
  if (items.some((i) => !i.quantity || i.quantity < 1)) {
    formError.value = 'La cantidad de cada componente debe ser al menos 1'
    return
  }
  formError.value = ''
  emit('save', {
    name: form.value.name,
    description: form.value.description || undefined,
    price: form.value.price,
    categoryId: form.value.categoryId,
    items,
  })
}
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-400 transition-all;
}
.btn-primary {
  @apply px-4 py-2 bg-workplace-red text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply px-4 py-2 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors;
}
</style>
