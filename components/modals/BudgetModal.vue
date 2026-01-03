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
            <DialogPanel class="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-6">
                Ver Presupuesto
              </DialogTitle>

              <!-- Summary Cards -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-blue-50 rounded-lg p-4">
                  <p class="text-xs text-gray-600 mb-1">Presupuesto Total</p>
                  <p class="text-2xl font-bold text-blue-600">$15,000</p>
                </div>
                <div class="bg-orange-50 rounded-lg p-4">
                  <p class="text-xs text-gray-600 mb-1">Gastos a la Fecha</p>
                  <p class="text-2xl font-bold text-orange-600">$8,450</p>
                </div>
                <div class="bg-green-50 rounded-lg p-4">
                  <p class="text-xs text-gray-600 mb-1">Disponible</p>
                  <p class="text-2xl font-bold text-green-600">$6,550</p>
                </div>
                <div class="bg-blue-50 rounded-lg p-4">
                  <p class="text-xs text-gray-600 mb-1">% Utilizado</p>
                  <p class="text-2xl font-bold text-blue-600">56.3%</p>
                </div>
              </div>

              <!-- Budget by Category -->
              <div class="mb-6">
                <h4 class="text-sm font-medium text-gray-900 mb-4">Presupuesto por Categoría</h4>
                <div class="space-y-4">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-gray-700">Ingredientes</span>
                      <span class="text-sm text-gray-600">$4,200 / $5,000</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-600 h-2 rounded-full" style="width: 84%"></div>
                    </div>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-gray-700">Servicios</span>
                      <span class="text-sm text-gray-600">$1,800 / $2,000</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-yellow-500 h-2 rounded-full" style="width: 90%"></div>
                    </div>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-gray-700">Nómina</span>
                      <span class="text-sm text-gray-600">$1,450 / $6,000</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-green-600 h-2 rounded-full" style="width: 24%"></div>
                    </div>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-gray-700">Otros</span>
                      <span class="text-sm text-gray-600">$1,000 / $2,000</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-600 h-2 rounded-full" style="width: 50%"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Edit Budget Form -->
              <div class="border-t pt-6">
                <h4 class="text-sm font-medium text-gray-900 mb-4">Ajustar Presupuestos</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Ingredientes</label>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm text-gray-600">$</span>
                      <input
                        v-model="budgetForm.ingredients"
                        type="number"
                        class="input-field flex-1"
                        placeholder="5000"
                      >
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Servicios</label>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm text-gray-600">$</span>
                      <input
                        v-model="budgetForm.services"
                        type="number"
                        class="input-field flex-1"
                        placeholder="2000"
                      >
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nómina</label>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm text-gray-600">$</span>
                      <input
                        v-model="budgetForm.payroll"
                        type="number"
                        class="input-field flex-1"
                        placeholder="6000"
                      >
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Otros</label>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm text-gray-600">$</span>
                      <input
                        v-model="budgetForm.others"
                        type="number"
                        class="input-field flex-1"
                        placeholder="2000"
                      >
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  @click="closeModal"
                  type="button"
                  class="btn-secondary"
                >
                  Cerrar
                </button>
                <button
                  @click="saveBudget"
                  type="button"
                  class="btn-primary"
                >
                  Guardar Cambios
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'save'])

const budgetForm = ref({
  ingredients: 5000,
  services: 2000,
  payroll: 6000,
  others: 2000
})

const closeModal = () => {
  emit('close')
}

const saveBudget = () => {
  emit('save', { ...budgetForm.value })
  closeModal()
}
</script>
