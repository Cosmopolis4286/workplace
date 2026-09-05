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
              <DialogTitle class="text-lg font-semibold text-gray-900 mb-4">Gestionar Proveedores</DialogTitle>

              <div v-if="localError" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {{ localError }}
              </div>

              <div class="space-y-2 mb-5 max-h-60 overflow-y-auto pr-1">
                <div v-if="suppliers.length === 0" class="text-center py-6 text-gray-400 text-sm">
                  Sin proveedores. Crea el primero abajo.
                </div>
                <div
                  v-for="supplier in suppliers"
                  :key="supplier.id"
                  class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 group"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 truncate">{{ supplier.name }}</p>
                    <p class="text-xs text-gray-400 truncate">
                      {{ supplier.contactName || supplier.phone || 'Sin datos de contacto' }}
                    </p>
                  </div>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Editar" @click="startEdit(supplier)">
                      <PencilIcon class="h-3.5 w-3.5" />
                    </button>
                    <button class="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar" @click="supplierToDelete = supplier">
                      <TrashIcon class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div class="border-t border-gray-100 pt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-3">
                  {{ editingId ? 'Editar proveedor' : 'Nuevo proveedor' }}
                </h4>
                <form @submit.prevent="handleSubmit" class="space-y-3">
                  <input v-model="form.name" type="text" required class="input-field" placeholder="Nombre del proveedor">
                  <div class="grid grid-cols-2 gap-3">
                    <input v-model="form.contactName" type="text" class="input-field" placeholder="Contacto (opcional)">
                    <input v-model="form.phone" type="text" class="input-field" placeholder="Teléfono (opcional)">
                  </div>
                  <div class="flex gap-2 pt-1">
                    <button v-if="editingId" type="button" class="btn-secondary text-sm flex-1" @click="cancelEdit">
                      Cancelar edición
                    </button>
                    <button type="submit" class="btn-primary text-sm flex-1" :disabled="saving">
                      {{ editingId ? 'Actualizar' : 'Crear proveedor' }}
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

  <TransitionRoot appear :show="!!supplierToDelete" as="template">
    <Dialog as="div" class="relative z-[60]" @close="supplierToDelete = null">
      <div class="fixed inset-0 bg-black/30" />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Eliminar proveedor</DialogTitle>
          <p class="text-sm text-gray-600 mb-5">
            ¿Eliminar "<strong>{{ supplierToDelete?.name }}</strong>"? Esta acción no se puede deshacer.
          </p>
          <div class="flex justify-end gap-3">
            <button class="btn-secondary" @click="supplierToDelete = null">Cancelar</button>
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
import { useSuppliers, type Supplier } from '~/composables/commerce/useSuppliers'

const props = defineProps<{ isOpen: boolean; saving?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { suppliers, createSupplier, updateSupplier, deleteSupplier } = useSuppliers()

const localError = ref<string | null>(null)
const editingId = ref<string | null>(null)
const supplierToDelete = ref<Supplier | null>(null)

const defaultForm = () => ({ name: '', contactName: '', phone: '' })
const form = ref(defaultForm())

function startEdit(supplier: Supplier) {
  editingId.value = supplier.id
  form.value = { name: supplier.name, contactName: supplier.contactName ?? '', phone: supplier.phone ?? '' }
  localError.value = null
}

function cancelEdit() {
  editingId.value = null
  form.value = defaultForm()
}

async function handleSubmit() {
  localError.value = null
  const payload = {
    name: form.value.name,
    contactName: form.value.contactName || undefined,
    phone: form.value.phone || undefined,
  }
  const result = editingId.value
    ? await updateSupplier(editingId.value, payload)
    : await createSupplier(payload)

  if (!result) {
    localError.value = 'No se pudo guardar el proveedor.'
    return
  }
  editingId.value = null
  form.value = defaultForm()
}

async function doDelete() {
  if (!supplierToDelete.value) return
  await deleteSupplier(supplierToDelete.value.id)
  supplierToDelete.value = null
}

function closeModal() {
  cancelEdit()
  localError.value = null
  emit('close')
}
</script>
