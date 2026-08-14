<template>
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-bold text-gray-900">Estadísticas públicas</h2>
      <button
        @click="saveStats"
        :disabled="savingStats"
        class="text-sm font-semibold bg-workplace-red text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
      >
        {{ savingStats ? 'Guardando…' : 'Guardar todo' }}
      </button>
    </div>

    <div class="divide-y divide-gray-50">
      <div
        v-for="stat in editableStats"
        :key="stat.key"
        class="px-6 py-4 grid grid-cols-3 gap-4 items-center"
      >
        <div>
          <p class="text-xs text-gray-400 font-medium mb-1">Clave</p>
          <code class="text-sm text-gray-600 bg-gray-50 px-2 py-0.5 rounded">{{ stat.key }}</code>
        </div>
        <div>
          <p class="text-xs text-gray-400 font-medium mb-1">Etiqueta</p>
          <input
            v-model="stat.label"
            class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>
        <div>
          <p class="text-xs text-gray-400 font-medium mb-1">
            Valor
            <span v-if="stat.isDynamic" class="ml-1 text-green-600 font-semibold">(automático)</span>
          </p>
          <div class="flex items-center gap-2">
            <input
              v-model="stat.value"
              :disabled="stat.isDynamic"
              class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              @click="stat.isDynamic = !stat.isDynamic"
              class="text-xs px-2 py-1.5 rounded border border-gray-200 hover:border-gray-300 text-gray-500 whitespace-nowrap"
              :title="stat.isDynamic ? 'Cambiar a valor manual' : 'Calcular automáticamente'"
            >
              {{ stat.isDynamic ? 'Manual' : 'Auto' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="editableStats.length === 0" class="px-6 py-10 text-center text-sm text-gray-400">
        No hay estadísticas configuradas. Se usarán los valores por defecto.
      </div>
    </div>

    <!-- Add stat -->
    <div class="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
      <input v-model="newStatKey" placeholder="clave (ej: commerces)" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 w-40" />
      <input v-model="newStatLabel" placeholder="Etiqueta" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 flex-1" />
      <input v-model="newStatValue" placeholder="Valor (ej: 500+)" class="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 w-28" />
      <button
        @click="addStat"
        :disabled="!newStatKey || !newStatLabel"
        class="text-sm font-semibold border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        Agregar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

export interface AdminStat {
  id?: string
  key: string
  label: string
  value: string
  isDynamic: boolean
  sortOrder: number
}

const emit = defineEmits<{
  error: [message: string | null]
}>()

const editableStats = ref<AdminStat[]>([])
const savingStats = ref(false)
const newStatKey = ref('')
const newStatLabel = ref('')
const newStatValue = ref('')

async function loadStats() {
  try {
    const { get } = useApi()
    editableStats.value = await get<AdminStat[]>('/landing/admin/stats')
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al cargar las estadísticas'))
  }
}

async function saveStats() {
  savingStats.value = true
  emit('error', null)
  try {
    const { patch } = useApi()
    await Promise.all(
      editableStats.value.map((s) =>
        patch(`/landing/admin/stats/${s.key}`, { label: s.label, value: s.value, isDynamic: s.isDynamic }),
      ),
    )
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al guardar las estadísticas'))
  } finally {
    savingStats.value = false
  }
}

function addStat() {
  if (!newStatKey.value || !newStatLabel.value) return
  editableStats.value.push({
    key: newStatKey.value.trim(),
    label: newStatLabel.value.trim(),
    value: newStatValue.value.trim(),
    isDynamic: false,
    sortOrder: editableStats.value.length,
  })
  newStatKey.value = ''
  newStatLabel.value = ''
  newStatValue.value = ''
}

onMounted(loadStats)
</script>
