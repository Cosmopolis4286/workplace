<template>
  <div class="border border-gray-100 rounded-xl overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
      <div class="flex items-center gap-2">
        <DocumentTextIcon class="h-3.5 w-3.5 text-gray-400" />
        <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Observaciones{{ isProvider ? '' : ' del proveedor' }}
        </p>
      </div>
      <button
        v-if="isProvider && !editing"
        class="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
        @click="startEdit"
      >
        <PencilIcon class="h-3.5 w-3.5" />
        {{ providerNotes || price ? 'Editar' : 'Agregar' }}
      </button>
    </div>

    <div class="p-4">
      <template v-if="!editing">
        <p v-if="providerNotes" class="text-sm text-gray-700 whitespace-pre-wrap">{{ providerNotes }}</p>
        <p v-else class="text-sm text-gray-400 italic">
          {{ isProvider
            ? 'Sin observaciones. Agrega notas sobre el acuerdo, fecha confirmada, detalles del trabajo, etc.'
            : 'El proveedor aún no ha dejado observaciones.' }}
        </p>
      </template>

      <template v-else>
        <div class="flex flex-wrap gap-1.5 mb-2">
          <button
            v-for="tpl in QUICK_REPLY_TEMPLATES"
            :key="tpl"
            type="button"
            class="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            @click="notesInput = tpl"
          >
            {{ tpl }}
          </button>
        </div>
        <textarea
          v-model="notesInput"
          rows="4"
          placeholder="Ej: Acordamos el lunes 15 a las 10am. Llevar herramientas propias..."
          class="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
        <div class="grid grid-cols-2 gap-2 mt-3">
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Precio acordado</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                v-model.number="priceInput"
                type="number"
                min="0"
                placeholder="0"
                class="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              v-if="suggestedPrice != null && !priceInput"
              type="button"
              class="mt-1 flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 font-medium"
              @click="priceInput = suggestedPrice"
            >
              <SparklesIcon class="h-3 w-3" />
              Sugerido: ${{ formatPrice(suggestedPrice) }} (prom. {{ suggestedPriceBasedOn }} trato{{ suggestedPriceBasedOn === 1 ? '' : 's' }})
            </button>
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Unidad (opcional)</label>
            <input
              v-model="priceUnitInput"
              type="text"
              placeholder="Ej: hora, proyecto"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-3">
          <button class="btn-secondary text-xs py-1.5 px-3" @click="editing = false">Cancelar</button>
          <button class="btn-primary text-xs py-1.5 px-3" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DocumentTextIcon, PencilIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const props = defineProps<{
  requestId: string
  isProvider: boolean
  providerNotes?: string
  price?: number
  priceUnit?: string
  suggestedPrice?: number | null
  suggestedPriceBasedOn?: number
  formatPrice: (p: number) => string
}>()

const emit = defineEmits<{
  updated: [providerNotes: string, backendResponse: Record<string, unknown>]
  error: [message: string]
}>()

const QUICK_REPLY_TEMPLATES = [
  'Te contacto en breve',
  'No disponible esta fecha, ¿flexibilidad?',
  'Confirmado, llevo todo lo necesario',
  'Necesito más información del trabajo',
]

const editing = ref(false)
const notesInput = ref('')
const priceInput = ref<number | null>(null)
const priceUnitInput = ref('')
const saving = ref(false)

function startEdit() {
  notesInput.value = props.providerNotes ?? ''
  priceInput.value = props.price ?? null
  priceUnitInput.value = props.priceUnit ?? ''
  editing.value = true
}

async function save() {
  saving.value = true
  try {
    const { patch } = useApi()
    const body: Record<string, unknown> = { providerNotes: notesInput.value }
    if (priceInput.value !== null && !Number.isNaN(priceInput.value)) body.price = priceInput.value
    if (priceUnitInput.value.trim()) body.priceUnit = priceUnitInput.value.trim()
    const updated = await patch<Record<string, unknown>>(`/services/requests/${props.requestId}`, body)
    emit('updated', notesInput.value, updated)
    editing.value = false
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al guardar observaciones'))
  } finally {
    saving.value = false
  }
}
</script>
