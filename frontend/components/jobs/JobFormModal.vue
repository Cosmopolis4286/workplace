<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="!saving && $emit('close')"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ editing ? 'Editar Empleo' : 'Nuevo Empleo' }}
            </h2>
            <button @click="$emit('close')" :disabled="saving" class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <div v-if="formError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ formError }}
          </div>

          <form @submit.prevent="$emit('submit')" class="space-y-4">
            <!-- Título -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-medium text-gray-700">Título <span class="text-red-500">*</span></label>
                <span class="text-[10px] text-gray-400">{{ form.title.length }}/120</span>
              </div>
              <input
                v-model="form.title"
                type="text"
                placeholder="Ej: Desarrollador Frontend"
                maxlength="120"
                required
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>

            <!-- Descripción -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Descripción <span class="text-red-500">*</span></label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Describe la vacante: responsabilidades, requisitos, beneficios..."
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              ></textarea>
            </div>

            <!-- Tipo y modalidad -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select v-model="form.type" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
                  <option v-for="(label, value) in typeLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Modalidad</label>
                <select v-model="form.modality" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
                  <option v-for="(label, value) in modalityLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
            </div>

            <!-- Salario -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Salario mín.</label>
                <input v-model.number="form.salaryMin" type="number" min="0" placeholder="0" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Salario máx.</label>
                <input v-model.number="form.salaryMax" type="number" min="0" placeholder="0" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
                <input v-model="form.salaryCurrency" type="text" placeholder="USD" maxlength="10" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
            </div>

            <!-- Ubicación y categoría -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Ubicación</label>
                <input v-model="form.location" type="text" placeholder="Ciudad, país..." class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                <select v-model="form.categoryId" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
                  <option value="">Sin categoría</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
            </div>

            <!-- Nivel de experiencia -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nivel de experiencia</label>
              <input v-model="form.experienceLevel" type="text" placeholder="Junior, Mid, Senior..." class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
            </div>

            <!-- Tags -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Etiquetas</label>
              <TagsInput v-model="form.tags" suggestions-endpoint="/jobs/catalog/tags" />
              <p class="mt-1.5 text-xs text-gray-400">Ayudan a que tu empleo aparezca en más búsquedas.</p>
            </div>

            <!-- Estado -->
            <div v-if="editing">
              <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
              <select v-model="form.status" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
                <option value="ACTIVE">Activo</option>
                <option value="PAUSED">Pausado</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="CLOSED">Cerrado</option>
              </select>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="$emit('close')"
                :disabled="saving"
                class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving || !isFormValid"
                class="flex-1 btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {{ saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Publicar empleo') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import TagsInput from '~/components/ui/TagsInput.vue'
import type { JobWithApplicationCount, JobCategory } from '~/composables/jobs/useJobs'

export interface JobFormData {
  title: string
  description: string
  salaryMin: number | undefined
  salaryMax: number | undefined
  salaryCurrency: string
  location: string
  type: JobWithApplicationCount['type']
  modality: JobWithApplicationCount['modality']
  experienceLevel: string
  tags: string[]
  categoryId: string
  status: JobWithApplicationCount['status']
}

const props = defineProps<{
  show: boolean
  editing: JobWithApplicationCount | null
  saving: boolean
  formError: string | null
  form: JobFormData
  categories: JobCategory[]
  typeLabels: Record<JobWithApplicationCount['type'], string>
  modalityLabels: Record<JobWithApplicationCount['modality'], string>
}>()

defineEmits<{
  close: []
  submit: []
}>()

const isFormValid = computed(() => props.form.title.trim().length > 0 && props.form.description.trim().length > 0)
</script>
