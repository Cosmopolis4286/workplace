<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 class="text-base font-bold text-gray-900">{{ editing ? 'Editar Plan' : 'Nuevo Plan' }}</h2>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>

          <form @submit.prevent="submit" class="p-6 space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="form.name" required class="input-field" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea v-model="form.description" rows="2" class="input-field resize-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Precio mensual <span class="text-red-500">*</span></label>
                <input v-model.number="form.price" type="number" min="0" step="0.01" required class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Precio anual</label>
                <input v-model.number="form.priceAnnual" type="number" min="0" step="0.01" class="input-field" />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Color</label>
                <input v-model="form.color" type="color" class="h-10 w-full border border-gray-200 rounded-xl cursor-pointer" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <select v-model="form.status" class="input-field">
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Orden</label>
                <input v-model.number="form.sortOrder" type="number" min="0" class="input-field" />
              </div>
            </div>

            <div class="flex gap-6 flex-wrap">
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.forCommerce" type="checkbox" class="w-4 h-4 rounded text-red-600" />Para Commerce
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.forFreelancer" type="checkbox" class="w-4 h-4 rounded text-red-600" />Para Freelancer
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.forNormal" type="checkbox" class="w-4 h-4 rounded text-red-600" />Para Normal
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.isPopular" type="checkbox" class="w-4 h-4 rounded text-red-600" />Marcar como Popular
              </label>
            </div>

            <!-- Categorías de negocio -->
            <fieldset class="border border-gray-200 rounded-xl p-4">
              <legend class="text-xs font-semibold text-gray-700 px-1">Categorías de negocio (vacío = todas)</legend>
              <div v-if="userCategories.length === 0" class="text-xs text-gray-400 italic mt-1">No hay categorías registradas</div>
              <div v-else class="grid grid-cols-2 gap-1.5 mt-2">
                <label
                  v-for="cat in userCategories" :key="cat.id"
                  class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1"
                >
                  <input
                    type="checkbox"
                    :checked="(form.categoryIds ?? []).includes(cat.id)"
                    @change="toggleCategory(cat.id, ($event.target as HTMLInputElement).checked)"
                    class="w-4 h-4 rounded text-red-600"
                  />
                  {{ cat.icon ? `${cat.icon} ` : '' }}{{ cat.name }}
                </label>
              </div>
            </fieldset>

            <!-- Límites -->
            <fieldset class="border border-gray-200 rounded-xl p-4">
              <legend class="text-xs font-semibold text-gray-700 px-1">Límites (-1 = ilimitado)</legend>
              <div class="grid grid-cols-2 gap-3 mt-2">
                <div><label class="block text-xs text-gray-500 mb-1">Productos</label><input v-model.number="form.maxProducts" type="number" min="-1" class="input-field" /></div>
                <div><label class="block text-xs text-gray-500 mb-1">Empleados</label><input v-model.number="form.maxEmployees" type="number" min="-1" class="input-field" /></div>
                <div><label class="block text-xs text-gray-500 mb-1">Sucursales</label><input v-model.number="form.maxBranches" type="number" min="-1" class="input-field" /></div>
                <div><label class="block text-xs text-gray-500 mb-1">Pedidos/mes</label><input v-model.number="form.maxOrders" type="number" min="-1" class="input-field" /></div>
                <div><label class="block text-xs text-gray-500 mb-1">Almacenamiento (GB)</label><input v-model.number="form.maxStorage" type="number" min="0" class="input-field" /></div>
              </div>
            </fieldset>

            <!-- Módulos -->
            <fieldset class="border border-gray-200 rounded-xl p-4">
              <legend class="text-xs font-semibold text-gray-700 px-1">Módulos incluidos</legend>
              <div class="grid grid-cols-2 gap-1.5 mt-2">
                <label
                  v-for="mod in allModules" :key="mod"
                  class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1"
                >
                  <input
                    type="checkbox"
                    :checked="(form.enabledModules ?? []).includes(mod)"
                    @change="toggleModule(mod, ($event.target as HTMLInputElement).checked)"
                    class="w-4 h-4 rounded text-red-600"
                  />
                  {{ moduleLabels[mod] ?? mod }}
                </label>
              </div>
            </fieldset>

            <!-- Features -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Features (una por línea)</label>
              <textarea
                :value="(form.features ?? []).join('\n')"
                @input="form.features = ($event.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)"
                rows="4"
                placeholder="Dashboard básico&#10;Hasta 50 productos&#10;..."
                class="input-field resize-none"
              />
            </div>

            <div v-if="error" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{{ error }}</div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
              <button type="submit" :disabled="saving" class="btn-primary">
                {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear Plan') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import type { Plan } from '~/composables/commerce/usePlans'

interface UserCategory { id: string; name: string; icon?: string }

const props = defineProps<{
  show: boolean
  editing: Plan | null
  saving: boolean
  error: string | null
  userCategories: UserCategory[]
  allModules: readonly string[]
  moduleLabels: Record<string, string>
}>()

const emit = defineEmits<{
  close: []
  submit: [form: PlanForm]
}>()

function defaultForm() {
  return {
    name: '', description: '', price: 0, priceAnnual: undefined as number | undefined,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE', isPopular: false, color: '#3B82F6', sortOrder: 0,
    forCommerce: true, forFreelancer: false, forNormal: false,
    categoryIds: [] as string[],
    maxProducts: 50, maxEmployees: 5, maxBranches: 1, maxOrders: -1, maxStorage: 1,
    features: [] as string[], enabledModules: [] as string[],
  }
}

export type PlanForm = ReturnType<typeof defaultForm>

const form = ref<PlanForm>(defaultForm())

watch(() => props.show, (visible) => {
  if (!visible) return
  const plan = props.editing
  form.value = plan
    ? {
        name: plan.name, description: plan.description ?? '', price: plan.price, priceAnnual: plan.priceAnnual ?? undefined,
        status: plan.status, isPopular: plan.isPopular, color: plan.color, sortOrder: plan.sortOrder,
        forCommerce: plan.forCommerce, forFreelancer: plan.forFreelancer, forNormal: plan.forNormal,
        categoryIds: [...(plan.categoryIds ?? [])],
        maxProducts: plan.maxProducts, maxEmployees: plan.maxEmployees, maxBranches: plan.maxBranches,
        maxOrders: plan.maxOrders, maxStorage: plan.maxStorage,
        features: [...plan.features], enabledModules: [...(plan.enabledModules ?? [])],
      }
    : defaultForm()
})

function toggleModule(mod: string, checked: boolean) {
  const current = form.value.enabledModules ?? []
  form.value.enabledModules = checked
    ? [...current.filter(m => m !== mod), mod]
    : current.filter(m => m !== mod)
}

function toggleCategory(catId: string, checked: boolean) {
  const current = form.value.categoryIds ?? []
  form.value.categoryIds = checked
    ? [...current.filter(c => c !== catId), catId]
    : current.filter(c => c !== catId)
}

function submit() {
  emit('submit', form.value)
}
</script>
