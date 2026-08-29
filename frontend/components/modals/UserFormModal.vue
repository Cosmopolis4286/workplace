<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
        <div class="absolute inset-0 bg-black/40" @click="close" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 class="text-base font-bold text-gray-900">{{ editing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
              <p class="text-xs text-gray-400 mt-0.5">{{ editing ? 'Modifica los datos del usuario' : 'Completa los datos para crear la cuenta' }}</p>
            </div>
            <div class="flex items-center gap-1">
              <NuxtLink
                v-if="editing && userId"
                :to="`/permissions/users?userId=${userId}`"
                class="px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Ver permisos
              </NuxtLink>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" @click="close">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>

          <form id="user-form" @submit.prevent="$emit('submit')" class="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="form.firstName" required type="text" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Apellido <span class="text-red-500">*</span></label>
                <input v-model="form.lastName" required type="text" class="input-field" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Correo electrónico <span class="text-red-500">*</span></label>
              <input v-model="form.email" required type="email" class="input-field" />
            </div>
            <div v-if="!editing">
              <label class="block text-xs font-medium text-gray-700 mb-1">Contraseña <span class="text-red-500">*</span></label>
              <input v-model="form.password" required type="password" minlength="8" placeholder="Mínimo 8 caracteres" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono <span class="text-gray-300">(opcional)</span></label>
              <input v-model="form.phone" type="tel" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Rol <span class="text-red-500">*</span></label>
              <select v-model="form.role" required class="input-field">
                <option v-for="r in creatableRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <div v-if="form.role === 'PROFESIONAL'" class="space-y-3">
              <div v-if="editing && !hadProfileOnOpen" class="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 flex items-center gap-1.5">
                <ExclamationCircleIcon class="h-3.5 w-3.5 flex-shrink-0" />
                Este usuario no tiene tipo de perfil asignado — sin uno no puede operar como comercio ni freelancer.
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de perfil <span class="text-red-500">*</span></label>
                <select v-model="form.businessProfileType" class="input-field">
                  <option value="BUSINESS">Negocio (tiene un Commerce)</option>
                  <option value="PROFESSIONAL">Profesional (freelancer / prestador de servicio)</option>
                </select>
              </div>
              <div v-if="form.businessProfileType === 'PROFESSIONAL'">
                <label class="block text-xs font-medium text-gray-700 mb-1">Subtipo</label>
                <select v-model="form.professionalSubtype" class="input-field">
                  <option value="FREELANCER">Freelancer</option>
                  <option value="SERVICE_PROVIDER">Prestador de servicio</option>
                </select>
              </div>
              <div v-if="!editing">
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  {{ form.businessProfileType === 'BUSINESS' ? 'Nombre del comercio' : 'Nombre del negocio' }}
                  <span class="text-gray-300">(opcional)</span>
                </label>
                <input v-model="form.commerceName" type="text" placeholder="Se puede configurar después" class="input-field" />
              </div>
            </div>
            <div class="p-4 bg-gray-50 rounded-xl space-y-3">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clasificación del perfil</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                  <select v-model="form.categoryId" class="input-field" @change="form.subcategoryId = ''">
                    <option value="">Sin categoría</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                      {{ cat.icon ? cat.icon + ' ' : '' }}{{ cat.name }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Subcategoría</label>
                  <select v-model="form.subcategoryId" :disabled="!form.categoryId" class="input-field disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">Sin subcategoría</option>
                    <option v-for="sub in availableSubcategories" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
                  </select>
                </div>
              </div>
            </div>
            <div v-if="formError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-center gap-2">
              <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0" />{{ formError }}
            </div>
          </form>

          <div class="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button type="button" class="btn-secondary flex-1" @click="close">Cancelar</button>
            <button type="submit" form="user-form" :disabled="saving" class="btn-primary flex-1">
              {{ saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear usuario') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { XMarkIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import type { UserCategory, UserFormData } from '~/composables/users/useUsers'
import type { Role } from '~/config/roles.config'

const props = defineProps<{
  modelValue: boolean
  form: UserFormData
  editing: boolean
  userId?: string | null
  // Si el usuario ya tenía un UserProfile de negocio al abrir el modal —
  // distinto de form.businessProfileType, que siempre tiene un valor por
  // los defaults de emptyUserForm(). Solo para mostrar el aviso de "sin
  // tipo asignado" (ver openEdit() en users.vue).
  hadProfileOnOpen?: boolean
  saving: boolean
  formError: string | null
  categories: UserCategory[]
  creatableRoles: { value: Role; label: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: []
}>()

const availableSubcategories = computed(() =>
  props.form.categoryId ? (props.categories.find(c => c.id === props.form.categoryId)?.subcategories ?? []) : []
)

function close() { emit('update:modelValue', false) }
</script>
