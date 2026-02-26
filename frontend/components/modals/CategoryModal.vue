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
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-6">
                Gestionar Categorías
              </DialogTitle>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Form: crear / editar -->
                <div>
                  <h4 class="text-sm font-medium text-gray-900 mb-4">
                    {{ editingCategory ? 'Editar Categoría' : 'Nueva Categoría' }}
                  </h4>
                  <form @submit.prevent="submitForm" class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                      <input
                        v-model="form.name"
                        type="text"
                        required
                        class="input-field"
                        placeholder="Nombre de la categoría"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
                      <div class="flex items-center space-x-2">
                        <input
                          v-model="form.color"
                          type="color"
                          class="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          v-model="form.color"
                          type="text"
                          class="input-field flex-1"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div class="flex gap-2">
                      <button type="submit" class="flex-1 btn-primary" :disabled="saving">
                        <span v-if="saving">Guardando…</span>
                        <span v-else>{{ editingCategory ? 'Actualizar' : 'Agregar' }} Categoría</span>
                      </button>
                      <button
                        v-if="editingCategory"
                        type="button"
                        @click="cancelEdit"
                        class="btn-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>

                <!-- Categories list -->
                <div>
                  <h4 class="text-sm font-medium text-gray-900 mb-4">Categorías Existentes</h4>
                  <div class="space-y-2 max-h-80 overflow-y-auto">
                    <div
                      v-for="category in categories"
                      :key="category.id"
                      class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div class="flex items-center space-x-3">
                        <div
                          class="w-6 h-6 rounded"
                          :style="{ backgroundColor: category.color }"
                        />
                        <span class="text-sm font-medium text-gray-900">{{ category.name }}</span>
                        <span v-if="category._count" class="text-xs text-gray-400">
                          {{ category._count.products }} prods.
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          @click="startEdit(category)"
                          type="button"
                          class="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button
                          @click="$emit('delete', category)"
                          type="button"
                          class="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div v-if="categories.length === 0" class="text-center py-8">
                      <p class="text-sm text-gray-500">No hay categorías aún</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button @click="closeModal" type="button" class="btn-secondary">
                  Cerrar
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

interface Category {
  id: string
  name: string
  color: string
  _count?: { products: number }
}

const props = defineProps<{
  isOpen: boolean
  categories: Category[]
  saving?: boolean
  editCategory?: Category | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', data: { name: string; color: string }): void
  (e: 'update', id: string, data: { name: string; color: string }): void
  (e: 'delete', category: Category): void
}>()

const editingCategory = ref<Category | null>(null)
const form = ref({ name: '', color: '#3b82f6' })

// Si el padre pasa editCategory (lápiz desde la fila del menú)
watch(() => props.editCategory, (cat) => {
  if (cat) {
    editingCategory.value = cat
    form.value = { name: cat.name, color: cat.color }
  }
}, { immediate: true })

const startEdit = (category: Category) => {
  editingCategory.value = category
  form.value = { name: category.name, color: category.color }
}

const cancelEdit = () => {
  editingCategory.value = null
  resetForm()
}

const resetForm = () => {
  form.value = { name: '', color: '#3b82f6' }
}

const submitForm = () => {
  if (!form.value.name.trim()) return
  if (editingCategory.value) {
    emit('update', editingCategory.value.id, { ...form.value })
    cancelEdit()
  } else {
    emit('add', { ...form.value })
    resetForm()
  }
}

const closeModal = () => {
  editingCategory.value = null
  resetForm()
  emit('close')
}
</script>
