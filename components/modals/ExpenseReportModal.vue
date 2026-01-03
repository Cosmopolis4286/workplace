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
                Generar Reporte de Gastos
              </DialogTitle>

              <form @submit.prevent="generateReport" class="space-y-6">
                <!-- Report Type Selection -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-3">Tipo de Reporte</label>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50" :class="reportForm.type === 'summary' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'">
                      <input v-model="reportForm.type" type="radio" value="summary" class="w-4 h-4">
                      <span class="ml-3 text-sm font-medium">Resumen</span>
                    </label>
                    <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50" :class="reportForm.type === 'detailed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'">
                      <input v-model="reportForm.type" type="radio" value="detailed" class="w-4 h-4">
                      <span class="ml-3 text-sm font-medium">Detallado</span>
                    </label>
                    <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50" :class="reportForm.type === 'comparison' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'">
                      <input v-model="reportForm.type" type="radio" value="comparison" class="w-4 h-4">
                      <span class="ml-3 text-sm font-medium">Comparativo</span>
                    </label>
                  </div>
                </div>

                <!-- Date Range -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                    <input
                      v-model="reportForm.startDate"
                      type="date"
                      required
                      class="input-field"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                    <input
                      v-model="reportForm.endDate"
                      type="date"
                      required
                      class="input-field"
                    >
                  </div>
                </div>

                <!-- Categories Selection -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-3">Categorías a Incluir</label>
                  <div class="space-y-2">
                    <label class="flex items-center">
                      <input v-model="reportForm.categories" type="checkbox" value="ingredientes" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Ingredientes</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="reportForm.categories" type="checkbox" value="servicios" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Servicios</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="reportForm.categories" type="checkbox" value="nomina" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Nómina</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="reportForm.categories" type="checkbox" value="otros" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Otros</span>
                    </label>
                  </div>
                </div>

                <!-- Output Format -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-3">Formato de Salida</label>
                  <div class="flex gap-2">
                    <label class="flex items-center">
                      <input v-model="reportForm.format" type="radio" value="pdf" class="w-4 h-4">
                      <span class="ml-2 text-sm text-gray-700">PDF</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="reportForm.format" type="radio" value="excel" class="w-4 h-4">
                      <span class="ml-2 text-sm text-gray-700">Excel</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="reportForm.format" type="radio" value="csv" class="w-4 h-4">
                      <span class="ml-2 text-sm text-gray-700">CSV</span>
                    </label>
                  </div>
                </div>

                <div class="flex justify-end space-x-3 pt-4 border-t">
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
                    Generar Reporte
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
import { ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'save'])

const reportForm = ref({
  type: 'summary',
  startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  categories: ['ingredientes', 'servicios', 'nomina', 'otros'],
  format: 'pdf'
})

const closeModal = () => {
  emit('close')
}

const generateReport = () => {
  emit('save', { ...reportForm.value })
  closeModal()
}
</script>
