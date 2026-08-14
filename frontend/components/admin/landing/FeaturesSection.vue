<template>
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-bold text-gray-900">Funciones</h2>
      <button
        @click="openFeatureModal(null)"
        class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
      >
        + Nueva
      </button>
    </div>

    <div v-if="loading" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

    <div v-else class="divide-y divide-gray-50">
      <div
        v-for="f in features"
        :key="f.id"
        class="px-6 py-4 flex items-start gap-4"
      >
        <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0', f.bg]">
          {{ f.icon.replace('Icon', '').slice(0, 2) }}
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-gray-900">{{ f.title }}</p>
          <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ f.description }}</p>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="f.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'"
          >
            {{ f.isActive ? 'Activo' : 'Oculto' }}
          </span>
          <button @click="openFeatureModal(f)" class="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <PencilIcon class="w-4 h-4" />
          </button>
          <button @click="deleteFeature(f.id)" class="p-1.5 text-gray-400 hover:text-red-500 rounded">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-if="features.length === 0 && !loading" class="px-6 py-10 text-center text-sm text-gray-400">
        No hay funciones configuradas. Crea la primera.
      </div>
    </div>
  </div>

  <!-- Modal Función -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showModal = false" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h3 class="font-black text-gray-900 text-lg">{{ editingId ? 'Editar función' : 'Nueva función' }}</h3>

        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</label>
            <input v-model="form.title" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200" placeholder="Ej: Gestión de Pedidos" />
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</label>
            <textarea v-model="form.description" rows="3" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ícono</label>
              <select v-model="form.icon" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200">
                <option v-for="i in ICON_OPTIONS" :key="i" :value="i">{{ i }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Color de fondo</label>
              <select v-model="form.bg" class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200">
                <option v-for="b in BG_OPTIONS" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="featureIsActive" v-model="form.isActive" class="rounded" />
            <label for="featureIsActive" class="text-sm text-gray-700">Mostrar en landing</label>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button @click="showModal = false" class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm">
            Cancelar
          </button>
          <button
            @click="saveFeature"
            :disabled="saving || !form.title || !form.description"
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
import { ICON_OPTIONS, BG_OPTIONS } from '~/config/landingAdmin.config'

export interface Feature {
  id: string
  title: string
  description: string
  icon: string
  bg: string
  isActive: boolean
  sortOrder: number
}
interface FeatureForm {
  title: string; description: string; icon: string; bg: string; isActive: boolean
}

const emit = defineEmits<{
  error: [message: string | null]
  count: [count: number]
}>()

const { confirm } = useConfirm()

const {
  items: features, loading, showModal, saving,
  editingId, form, error: featuresError,
  load, openModal: openFeatureModalRaw, save: saveFeatureRaw, remove: removeFeature,
} = useLandingCrudSection<Feature, FeatureForm>(
  '/landing/admin/features',
  () => ({ title: '', description: '', icon: ICON_OPTIONS[0], bg: BG_OPTIONS[0], isActive: true }),
)
function openFeatureModal(f: Feature | null) { openFeatureModalRaw(f) }
async function saveFeature() {
  if (!form.title || !form.description) return
  await saveFeatureRaw(editingId.value ? {} : { sortOrder: features.value.length })
}
async function deleteFeature(id: string) {
  const ok = await confirm({ title: 'Eliminar función', message: '¿Eliminar esta función?', confirmText: 'Eliminar', variant: 'danger' })
  if (!ok) return
  await removeFeature(id)
}

watch(featuresError, (v) => emit('error', v))
watch(features, (v) => emit('count', v.length), { deep: false })

onMounted(load)
</script>
