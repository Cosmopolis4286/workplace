<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
        leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
              <DialogTitle class="text-lg font-semibold text-gray-900 mb-4">Gestionar Categorías</DialogTitle>

              <!-- Error -->
              <div v-if="localError" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {{ localError }}
              </div>

              <!-- Category list -->
              <div class="space-y-2 mb-5 max-h-60 overflow-y-auto pr-1">
                <div v-if="categories.length === 0" class="text-center py-6 text-gray-400 text-sm">
                  Sin categorías. Crea la primera abajo.
                </div>
                <div
                  v-for="cat in categories"
                  :key="cat.id"
                  class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 group"
                >
                  <span class="h-4 w-4 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 truncate">{{ cat.name }}</p>
                    <p class="text-xs text-gray-400">Presupuesto: {{ formatCurrency(cat.budget) }} · {{ cat._count?.expenses ?? 0 }} gastos</p>
                  </div>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      class="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      title="Editar"
                      @click="startEdit(cat)"
                    >
                      <PencilIcon class="h-3.5 w-3.5" />
                    </button>
                    <button
                      class="p-1.5 rounded hover:bg-red-50 text-red-500"
                      title="Eliminar"
                      :disabled="(cat._count?.expenses ?? 0) > 0"
                      @click="requestDelete(cat)"
                    >
                      <TrashIcon class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Form: create or edit -->
              <div class="border-t border-gray-100 pt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-3">
                  {{ editingId ? 'Editar categoría' : 'Nueva categoría' }}
                </h4>
                <form @submit.prevent="handleSubmit" class="space-y-3">
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    class="input-field"
                    placeholder="Nombre de la categoría"
                  />
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Color</label>
                      <div class="flex items-center gap-2">
                        <input v-model="form.color" type="color" class="h-9 w-12 rounded border border-gray-300 cursor-pointer p-0.5" />
                        <input v-model="form.color" type="text" class="input-field flex-1" placeholder="#6b7280" />
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Presupuesto mensual</label>
                      <input v-model.number="form.budget" type="number" min="0" step="0.01" class="input-field" placeholder="0.00" />
                    </div>
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button
                      v-if="editingId"
                      type="button"
                      class="btn-secondary text-sm flex-1"
                      @click="cancelEdit"
                    >Cancelar edición</button>
                    <button
                      type="submit"
                      class="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
                      :disabled="saving"
                    >
                      <span v-if="saving" class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {{ editingId ? 'Actualizar' : 'Crear categoría' }}
                    </button>
                  </div>
                </form>
              </div>

              <div class="flex justify-end mt-4">
                <button class="btn-secondary text-sm" @click="closeModal">Cerrar</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Delete confirmation -->
  <TransitionRoot appear :show="!!categoryToDelete" as="template">
    <Dialog as="div" class="relative z-[60]" @close="categoryToDelete = null">
      <div class="fixed inset-0 bg-black/30" />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Eliminar categoría</DialogTitle>
          <p class="text-sm text-gray-600 mb-5">
            ¿Eliminar "<strong>{{ categoryToDelete?.name }}</strong>"? Esta acción no se puede deshacer.
          </p>
          <div class="flex justify-end gap-3">
            <button class="btn-secondary" @click="categoryToDelete = null">Cancelar</button>
            <button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium" @click="doDelete">
              Eliminar
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { ExpenseCategory } from '~/composables/commerce/useExpenses'
import { useUserPreferences } from '~/composables/users/useUserPreferences'

const { formatCurrency: _fmt } = useUserPreferences()

const props = defineProps<{
  isOpen: boolean
  categories: ExpenseCategory[]
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', payload: { name: string; color: string; budget: number }): void
  (e: 'update', payload: { id: string; name: string; color: string; budget: number }): void
  (e: 'delete', id: string): void
}>()

const localError     = ref<string | null>(null)
const editingId      = ref<string | null>(null)
const categoryToDelete = ref<ExpenseCategory | null>(null)

const defaultForm = () => ({ name: '', color: '#6b7280', budget: 0 })
const form = ref(defaultForm())

function formatCurrency(value: number) { return _fmt.value(value) }

function startEdit(cat: ExpenseCategory) {
  editingId.value  = cat.id
  form.value       = { name: cat.name, color: cat.color, budget: cat.budget }
  localError.value = null
}

function cancelEdit() {
  editingId.value = null
  form.value      = defaultForm()
}

async function handleSubmit() {
  localError.value = null
  try {
    if (editingId.value) {
      emit('update', { id: editingId.value, ...form.value })
      editingId.value = null
    } else {
      emit('create', { ...form.value })
    }
    form.value = defaultForm()
  } catch (e: any) {
    localError.value = e.message
  }
}

function requestDelete(cat: ExpenseCategory) {
  if ((cat._count?.expenses ?? 0) > 0) {
    localError.value = `No se puede eliminar: la categoría tiene ${cat._count!.expenses} gasto(s) asociado(s).`
    return
  }
  categoryToDelete.value = cat
}

function doDelete() {
  if (!categoryToDelete.value) return
  emit('delete', categoryToDelete.value.id)
  categoryToDelete.value = null
}

function closeModal() {
  cancelEdit()
  localError.value = null
  emit('close')
}
</script>
