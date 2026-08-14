<template>
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-bold text-gray-900">Cómo funciona</h2>
      <button
        @click="openStepModal(null)"
        class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
      >
        + Nuevo
      </button>
    </div>

    <div v-if="loading" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

    <div v-else class="divide-y divide-gray-50">
      <div
        v-for="(s, idx) in steps"
        :key="s.id"
        class="px-6 py-4 flex items-start gap-4"
      >
        <div class="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-workplace-red text-sm font-black flex-shrink-0">
          {{ idx + 1 }}
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-gray-900">{{ s.title }}</p>
          <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ s.desc }}</p>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="s.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'"
          >
            {{ s.isActive ? 'Activo' : 'Oculto' }}
          </span>
          <button @click="openStepModal(s)" class="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <PencilIcon class="w-4 h-4" />
          </button>
          <button @click="deleteStep(s.id)" class="p-1.5 text-gray-400 hover:text-red-500 rounded">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-if="steps.length === 0 && !loading" class="px-6 py-10 text-center text-sm text-gray-400">
        No hay pasos configurados. Crea el primero.
      </div>
    </div>
  </div>

  <!-- Modal Paso -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showModal = false" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h3 class="font-black text-gray-900 text-lg">{{ editingId ? 'Editar paso' : 'Nuevo paso' }}</h3>

        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</label>
            <input v-model="form.title" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" placeholder="Ej: Crea tu cuenta" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</label>
            <textarea v-model="form.desc" rows="3" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ícono</label>
            <select v-model="form.icon" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200">
              <option v-for="i in ICON_OPTIONS" :key="i" :value="i">{{ i }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="stepIsActive" v-model="form.isActive" class="rounded" />
            <label for="stepIsActive" class="text-sm text-gray-700">Mostrar en landing</label>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button @click="showModal = false" class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
            Cancelar
          </button>
          <button
            @click="saveStep"
            :disabled="saving || !form.title || !form.desc"
            class="flex-1 bg-workplace-red text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 text-sm"
          >
            {{ saving ? 'Guardando…' : (editingId ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useLandingCrudSection } from '~/composables/admin/useLandingCrudSection'
import { useConfirm } from '~/composables/ui/useConfirm'
import { ICON_OPTIONS } from '~/config/landingAdmin.config'

export interface Step {
  id: string
  title: string
  desc: string
  icon: string
  isActive: boolean
  sortOrder: number
}
interface StepForm {
  title: string; desc: string; icon: string; isActive: boolean
}

const emit = defineEmits<{
  error: [message: string | null]
}>()

const { confirm } = useConfirm()

const {
  items: steps, loading, showModal, saving,
  editingId, form, error: stepsError,
  load, openModal: openStepModalRaw, save: saveStepRaw, remove: removeStep,
} = useLandingCrudSection<Step, StepForm>(
  '/landing/admin/steps',
  () => ({ title: '', desc: '', icon: ICON_OPTIONS[0], isActive: true }),
)
function openStepModal(s: Step | null) { openStepModalRaw(s) }
async function saveStep() {
  if (!form.title || !form.desc) return
  await saveStepRaw(editingId.value ? {} : { sortOrder: steps.value.length })
}
async function deleteStep(id: string) {
  const ok = await confirm({ title: 'Eliminar paso', message: '¿Eliminar este paso?', confirmText: 'Eliminar', variant: 'danger' })
  if (!ok) return
  await removeStep(id)
}

watch(stepsError, (v) => emit('error', v))

onMounted(load)
</script>
