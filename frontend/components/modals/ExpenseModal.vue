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
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                {{ isEditing ? 'Editar Gasto' : 'Nuevo Gasto' }}
              </DialogTitle>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <!-- Description -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                  <input
                    v-model="form.description"
                    type="text"
                    required
                    class="input-field"
                    placeholder="Descripción del gasto"
                  />
                </div>

                <!-- Amount + Date -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                    <input
                      v-model.number="form.amount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      class="input-field"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input v-model="form.date" type="date" required class="input-field" />
                  </div>
                </div>

                <!-- Category + Type -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select v-model="form.categoryId" class="input-field">
                      <option value="">Sin categoría</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                        {{ cat.name }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select v-model="form.type" required class="input-field">
                      <option value="OPERATIVO">Operativo</option>
                      <option value="FIJO">Fijo</option>
                      <option value="EXTRAORDINARIO">Extraordinario</option>
                    </select>
                  </div>
                </div>

                <!-- Status + Payment method -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                    <select v-model="form.status" required class="input-field">
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="PAGADO">Pagado</option>
                      <option value="VENCIDO">Vencido</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                    <select v-model="form.paymentMethod" class="input-field">
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                </div>

                <!-- Supplier + Receipt -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                    <input v-model="form.supplier" type="text" class="input-field" placeholder="Nombre del proveedor" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Recibo / Factura</label>
                    <input v-model="form.receipt" type="text" class="input-field" placeholder="Ej. REC-001" />
                  </div>
                </div>

                <!-- Notes -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea v-model="form.notes" rows="2" class="input-field resize-none" placeholder="Observaciones opcionales" />
                </div>

                <div class="flex justify-end gap-3 pt-2">
                  <button type="button" @click="closeModal" class="btn-secondary" :disabled="saving">Cancelar</button>
                  <button type="submit" class="btn-primary flex items-center gap-2" :disabled="saving">
                    <span v-if="saving" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import type { Expense, ExpenseCategory } from '~/composables/useExpenses'

const props = defineProps<{
  isOpen: boolean
  expense?: Expense | null
  categories: ExpenseCategory[]
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: Record<string, any>): void
}>()

const isEditing = computed(() => !!props.expense)

const defaultForm = () => ({
  description:   '',
  amount:        0,
  date:          new Date().toISOString().split('T')[0],
  type:          'OPERATIVO' as const,
  status:        'PENDIENTE' as const,
  paymentMethod: 'EFECTIVO' as const,
  categoryId:    '',
  supplier:      '',
  receipt:       '',
  notes:         '',
})

const form = ref(defaultForm())

watch(
  () => props.expense,
  (expense) => {
    if (expense) {
      form.value = {
        description:   expense.description,
        amount:        expense.amount,
        date:          expense.date.slice(0, 10),
        type:          expense.type,
        status:        expense.status,
        paymentMethod: expense.paymentMethod,
        categoryId:    expense.categoryId ?? '',
        supplier:      expense.supplier ?? '',
        receipt:       expense.receipt ?? '',
        notes:         expense.notes ?? '',
      }
    } else {
      form.value = defaultForm()
    }
  },
  { immediate: true },
)

function closeModal() {
  emit('close')
  form.value = defaultForm()
}

function handleSubmit() {
  const payload: Record<string, any> = {
    description:   form.value.description,
    amount:        form.value.amount,
    date:          form.value.date,
    type:          form.value.type,
    status:        form.value.status,
    paymentMethod: form.value.paymentMethod,
  }
  if (form.value.categoryId) payload.categoryId = form.value.categoryId
  if (form.value.supplier)   payload.supplier   = form.value.supplier
  if (form.value.receipt)    payload.receipt    = form.value.receipt
  if (form.value.notes)      payload.notes      = form.value.notes

  emit('save', payload)
}
</script>
