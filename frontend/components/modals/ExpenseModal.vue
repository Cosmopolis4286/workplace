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
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                {{ isEditing ? 'Editar Gasto' : 'Nuevo Gasto' }}
              </DialogTitle>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    v-model="form.description"
                    type="text"
                    required
                    class="input-field"
                    placeholder="Descripción del gasto"
                  >
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                    <input
                      v-model.number="form.amount"
                      type="number"
                      step="0.01"
                      required
                      class="input-field"
                      placeholder="0.00"
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                      v-model="form.date"
                      type="date"
                      required
                      class="input-field"
                    >
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
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
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select v-model="form.type" required class="input-field">
                      <option value="fijo">Fijo</option>
                      <option value="operativo">Operativo</option>
                      <option value="extraordinario">Extraordinario</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select v-model="form.status" required class="input-field">
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                      <option value="vencido">Vencido</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                    <select v-model="form.paymentMethod" class="input-field">
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input
                    v-model="form.supplier"
                    type="text"
                    class="input-field"
                    placeholder="Nombre del proveedor"
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
                    {{ isEditing ? 'Actualizar' : 'Crear' }} Gasto
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
import { ref, watch, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps({
  isOpen: Boolean,
  expense: Object,
  categories: Array
})

const emit = defineEmits(['close', 'save'])

const isEditing = computed(() => !!props.expense)

const form = ref({
  description: '',
  amount: 0,
  category: '',
  date: new Date().toISOString().split('T')[0],
  type: 'operativo',
  status: 'pendiente',
  supplier: '',
  receipt: '',
  paymentMethod: 'efectivo'
})

watch(() => props.expense, (expense) => {
  if (expense) {
    form.value = {
      ...expense,
      date: new Date(expense.date).toISOString().split('T')[0]
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const resetForm = () => {
  form.value = {
    description: '',
    amount: 0,
    category: '',
    date: new Date().toISOString().split('T')[0],
    type: 'operativo',
    status: 'pendiente',
    supplier: '',
    receipt: '',
    paymentMethod: 'efectivo'
  }
}

const closeModal = () => {
  emit('close')
  resetForm()
}

const handleSubmit = () => {
  emit('save', { ...form.value })
  closeModal()
}
</script>