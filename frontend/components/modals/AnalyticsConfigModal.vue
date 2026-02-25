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
                Configurar Analytics
              </DialogTitle>

              <form @submit.prevent="saveConfig" class="space-y-6">
                <!-- Metrics to Display -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-3">Métricas a Mostrar</label>
                  <div class="space-y-2">
                    <label class="flex items-center">
                      <input v-model="config.metrics" type="checkbox" value="revenue" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Ingresos Totales</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="config.metrics" type="checkbox" value="orders" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Pedidos</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="config.metrics" type="checkbox" value="avgTicket" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Ticket Promedio</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="config.metrics" type="checkbox" value="conversion" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Conversión</span>
                    </label>
                  </div>
                </div>

                <!-- Charts Configuration -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-3">Gráficos a Mostrar</label>
                  <div class="space-y-2">
                    <label class="flex items-center">
                      <input v-model="config.charts" type="checkbox" value="revenue" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Tendencia de Ingresos</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="config.charts" type="checkbox" value="orders" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Pedidos por Hora</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="config.charts" type="checkbox" value="topProducts" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Productos Más Vendidos</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="config.charts" type="checkbox" value="segments" class="w-4 h-4 rounded">
                      <span class="ml-2 text-sm text-gray-700">Segmentos de Clientes</span>
                    </label>
                  </div>
                </div>

                <!-- Default Period -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Período Predeterminado</label>
                  <select v-model="config.defaultPeriod" class="input-field">
                    <option value="7d">Últimos 7 días</option>
                    <option value="30d">Últimos 30 días</option>
                    <option value="90d">Últimos 90 días</option>
                    <option value="1y">Último año</option>
                  </select>
                </div>

                <!-- Comparison Setting -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Comparación Predeterminada</label>
                  <select v-model="config.defaultComparison" class="input-field">
                    <option value="previous">Período anterior</option>
                    <option value="year">Año anterior</option>
                    <option value="none">Sin comparación</option>
                  </select>
                </div>

                <!-- Auto Refresh -->
                <div>
                  <label class="flex items-center">
                    <input v-model="config.autoRefresh" type="checkbox" class="w-4 h-4 rounded">
                    <span class="ml-2 text-sm font-medium text-gray-700">Actualizar automáticamente cada 5 minutos</span>
                  </label>
                </div>

                <!-- Email Reports -->
                <div>
                  <label class="flex items-center">
                    <input v-model="config.emailReports" type="checkbox" class="w-4 h-4 rounded">
                    <span class="ml-2 text-sm font-medium text-gray-700">Recibir reportes por correo (semanal)</span>
                  </label>
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
                    Guardar Configuración
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

const config = ref({
  metrics: ['revenue', 'orders', 'avgTicket', 'conversion'],
  charts: ['revenue', 'orders', 'topProducts', 'segments'],
  defaultPeriod: '30d',
  defaultComparison: 'previous',
  autoRefresh: true,
  emailReports: false
})

const closeModal = () => {
  emit('close')
}

const saveConfig = () => {
  emit('save', { ...config.value })
  closeModal()
}
</script>
