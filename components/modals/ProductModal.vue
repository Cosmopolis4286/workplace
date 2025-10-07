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
                    <select v-model="form.category" required class="input-field">
                      <option value="">Seleccionar categoría</option>
                      <option v-for="category in categories" :key="category.id" :value="category.name">
                        {{ category.name }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Precio de Venta</label>
                    <input
                      v-model.number="form.price"
                      type="number"
                      step="0.01"
                      required
                      class="input-field"
                      placeholder="0.00"
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                    <input
                      v-model.number="form.cost"
                      type="number"
                      step="0.01"
                      required
                      class="input-field"
                      placeholder="0.00"
                    >
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
                  <label class="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                  <input
                    v-model="form.image"
                    type="url"
                    class="input-field"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  >
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
import { ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps({
  isOpen: Boolean,
  product: Object,
  categories: Array
})

const emit = defineEmits(['close', 'save'])

const isEditing = computed(() => !!props.product)

const form = ref({
  name: '',
  category: '',
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
  ingredients: [],
  allergens: []
})

const resetForm = () => {
  form.value = {
    name: '',
    category: '',
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
    ingredients: [],
    allergens: []
  }
}

watch(() => props.product, (product) => {
  if (product) {
    form.value = { ...product }
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
</script>