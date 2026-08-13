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
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                {{ isEditing ? 'Editar Producto' : 'Nuevo Producto' }}
              </DialogTitle>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      v-model="form.name"
                      type="text"
                      required
                      class="input-field"
                      placeholder="Nombre del producto"
                    >
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
                    <label class="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                    <input
                      v-model="form.brand"
                      type="text"
                      class="input-field"
                      placeholder="Marca del producto"
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Precio de Venta (USD)</label>
                    <input
                      v-model.number="form.price"
                      type="number"
                      step="0.01"
                      required
                      class="input-field"
                      placeholder="0.00"
                    >
                    <p v-if="defaultRate && form.price > 0" class="text-xs text-indigo-500 mt-1">
                      ≈ {{ convertLabel(form.price) }} {{ defaultRate.code }}
                      <span class="text-gray-400">({{ rateLabel }})</span>
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Costo (USD)</label>
                    <input
                      v-model.number="form.cost"
                      type="number"
                      step="0.01"
                      required
                      class="input-field"
                      placeholder="0.00"
                    >
                    <p v-if="defaultRate && form.cost > 0" class="text-xs text-indigo-500 mt-1">
                      ≈ {{ convertLabel(form.cost) }} {{ defaultRate.code }}
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                    <input
                      v-model.number="form.stock"
                      type="number"
                      required
                      class="input-field"
                      placeholder="0"
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                    <input
                      v-model.number="form.minStock"
                      type="number"
                      required
                      class="input-field"
                      placeholder="0"
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tiempo de Preparación (min)</label>
                    <input
                      v-model.number="form.preparationTime"
                      type="number"
                      class="input-field"
                      placeholder="15"
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Calorías</label>
                    <input
                      v-model.number="form.calories"
                      type="number"
                      class="input-field"
                      placeholder="250"
                    >
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    v-model="form.description"
                    rows="3"
                    class="input-field"
                    placeholder="Descripción del producto"
                  ></textarea>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Etiquetas</label>
                  <TagsInput v-model="form.tags" suggestions-endpoint="/catalog/tags" />
                  <p class="mt-1 text-xs text-gray-400">Ayudan a que tu producto aparezca en más búsquedas.</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                  <div class="flex gap-2">
                    <input
                      v-model="form.image"
                      type="url"
                      class="input-field flex-1"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    >
                    <button
                      v-if="isEditing"
                      type="button"
                      :disabled="uploadingImage"
                      class="shrink-0 inline-flex items-center justify-center px-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      @click="handleTakePhoto"
                    >
                      <CameraIcon class="h-5 w-5" />
                    </button>
                  </div>
                  <p v-if="!isEditing" class="mt-1 text-xs text-gray-400">
                    Podrás tomar una foto después de crear el producto.
                  </p>
                </div>

                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">En Venta</label>
                    <p class="text-xs text-gray-500">Mostrar producto disponible para venta</p>
                  </div>
                  <button
                    type="button"
                    @click="form.forSale = !form.forSale"
                    :class="form.forSale ? 'bg-indigo-600' : 'bg-gray-200'"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span
                      :class="form.forSale ? 'translate-x-5' : 'translate-x-0'"
                      class="pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    >
                      <span
                        :class="form.forSale ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'"
                        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
                        aria-hidden="true"
                      >
                        <svg class="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                          <path
                            d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </span>
                      <span
                        :class="form.forSale ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100'"
                        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
                        aria-hidden="true"
                      >
                        <svg class="h-3 w-3 text-indigo-600" fill="currentColor" viewBox="0 0 12 12">
                          <path
                            d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 5.586 3.707 4.293z"
                          />
                        </svg>
                      </span>
                    </span>
                  </button>
                </div>

                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Financiable con Cashea/Krece</label>
                    <p class="text-xs text-gray-500">Permite pagar este producto en cuotas (BNPL)</p>
                  </div>
                  <button
                    type="button"
                    @click="form.bnplEligible = !form.bnplEligible"
                    :class="form.bnplEligible ? 'bg-indigo-600' : 'bg-gray-200'"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span
                      :class="form.bnplEligible ? 'translate-x-5' : 'translate-x-0'"
                      class="pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    >
                      <span
                        :class="form.bnplEligible ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'"
                        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
                        aria-hidden="true"
                      >
                        <svg class="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                          <path
                            d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </span>
                      <span
                        :class="form.bnplEligible ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100'"
                        class="absolute inset-0 flex h-full w-full items-center justify-center transition-opacity"
                        aria-hidden="true"
                      >
                        <svg class="h-3 w-3 text-indigo-600" fill="currentColor" viewBox="0 0 12 12">
                          <path
                            d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 5.586 3.707 4.293z"
                          />
                        </svg>
                      </span>
                    </span>
                  </button>
                </div>

                <div class="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    @click="closeModal"
                    class="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    class="btn-primary"
                  >
                    {{ isEditing ? 'Actualizar' : 'Crear' }} Producto
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

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { CameraIcon } from '@heroicons/vue/24/outline'
import { useDefaultRate } from '~/composables/wallets/useDefaultRate'
import { useCamera } from '~/composables/core/useCamera'
import { useMenu } from '~/composables/catalog/useMenu'
import TagsInput from '~/components/ui/TagsInput.vue'

const { defaultRate, convertLabel, rateLabel, load } = useDefaultRate()
onMounted(load)

const { takePhoto } = useCamera()
const { uploadProductImage } = useMenu()
const uploadingImage = ref(false)

const props = defineProps({
  isOpen: Boolean,
  product: Object,
  categories: Array
})

const emit = defineEmits(['close', 'save'])

const isEditing = computed(() => !!props.product)

const form = ref({
  name: '',
  categoryId: '',
  brand: '',
  price: 0,
  cost: 0,
  stock: 0,
  minStock: 5,
  maxStock: 50,
  unit: 'unidad',
  description: '',
  image: '',
  preparationTime: 15,
  calories: 0,
  forSale: true,
  bnplEligible: true,
  ingredients: [],
  allergens: [],
  tags: []
})

const resetForm = () => {
  form.value = {
    name: '',
    categoryId: '',
    brand: '',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 5,
    maxStock: 50,
    unit: 'unidad',
    description: '',
    image: '',
    preparationTime: 15,
    calories: 0,
    forSale: true,
    bnplEligible: true,
    ingredients: [],
    allergens: [],
    tags: []
  }
}

watch(() => props.product, (product) => {
  if (product) {
    form.value = { ...product, tags: product.tags ?? [] }
  } else {
    resetForm()
  }
}, { immediate: true })

const closeModal = () => {
  emit('close')
  resetForm()
}

const handleSubmit = () => {
  emit('save', { ...form.value })
  closeModal()
}

const handleTakePhoto = async () => {
  if (!props.product?.id) return
  const file = await takePhoto()
  if (!file) return

  uploadingImage.value = true
  try {
    const updated = await uploadProductImage(props.product.id, file)
    if (updated) form.value.image = updated.image ?? form.value.image
  } finally {
    uploadingImage.value = false
  }
}
</script>