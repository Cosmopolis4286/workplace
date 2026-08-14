<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-base font-bold text-gray-900">Asignar Suscripción</h2>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>
          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">ID de Usuario <span class="text-red-500">*</span></label>
              <input v-model="form.userId" required placeholder="UUID del usuario" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Plan <span class="text-red-500">*</span></label>
              <select v-model="form.planId" required class="input-field">
                <option value="" disabled>Selecciona un plan</option>
                <option v-for="p in activePlans" :key="p.id" :value="p.id">
                  {{ p.name }} — {{ formatPrice(p.price) }}/mes
                </option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Intervalo</label>
                <select v-model="form.interval" class="input-field">
                  <option value="MONTHLY">Mensual</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <select v-model="form.status" class="input-field">
                  <option value="ACTIVE">Activo</option>
                  <option value="TRIAL">Prueba</option>
                  <option value="PENDING">Pendiente</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Precio pagado (opcional)</label>
              <input v-model.number="form.pricePaid" type="number" min="0" step="0.01" placeholder="Usa precio del plan si vacío" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Fecha fin (opcional)</label>
              <input v-model="form.endAt" type="date" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <input v-model="form.notes" placeholder="Notas internas..." class="input-field" />
            </div>
            <div v-if="error" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{{ error }}</div>
            <div class="flex gap-3 pt-2">
              <button type="button" class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
              <button type="submit" :disabled="assigning" class="btn-primary flex-1">
                {{ assigning ? 'Asignando...' : 'Asignar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import type { Plan } from '~/composables/commerce/usePlans'

const props = defineProps<{
  show: boolean
  plans: Plan[]
  preselectedPlanId: string | null
  assigning: boolean
  error: string | null
  formatPrice: (n: number) => string
}>()

const emit = defineEmits<{
  close: []
  submit: [form: AssignForm]
}>()

function defaultForm() {
  return {
    userId: '', planId: '', interval: 'MONTHLY' as 'MONTHLY' | 'ANNUAL',
    status: 'ACTIVE' as string, pricePaid: undefined as number | undefined, endAt: '', notes: '',
  }
}

export type AssignForm = ReturnType<typeof defaultForm>

const form = ref<AssignForm>(defaultForm())

const activePlans = computed(() => props.plans.filter(p => p.status === 'ACTIVE'))

watch(() => props.show, (visible) => {
  if (!visible) return
  form.value = defaultForm()
  if (props.preselectedPlanId) form.value.planId = props.preselectedPlanId
})

function submit() {
  emit('submit', form.value)
}
</script>
