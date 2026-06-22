<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 class="font-black text-gray-900 text-lg">Reportar problema</h3>

        <div>
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivo</label>
          <input
            v-model="reason"
            type="text"
            maxlength="200"
            placeholder="Ej: No recibí el pedido, el proveedor no respondió…"
            class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>

        <div>
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción (opcional)</label>
          <textarea
            v-model="description"
            rows="3"
            maxlength="1000"
            placeholder="Cuéntanos más detalles…"
            class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
          />
        </div>

        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
        <p v-if="sent" class="text-xs text-green-600">Reporte enviado. Nuestro equipo lo revisará pronto.</p>

        <div class="flex gap-3 pt-1">
          <button class="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 text-sm" @click="close">
            {{ sent ? 'Cerrar' : 'Cancelar' }}
          </button>
          <button
            v-if="!sent"
            :disabled="sending || reason.trim().length < 3"
            class="flex-1 bg-workplace-red text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 text-sm"
            @click="submit"
          >
            {{ sending ? 'Enviando…' : 'Enviar reporte' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useReports, type ReportEntityType } from '~/composables/useReports'

const props = defineProps<{
  modelValue: boolean
  entityType: ReportEntityType
  entityId?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const { sending, error, fileReport } = useReports()
const reason = ref('')
const description = ref('')
const sent = ref(false)

watch(() => props.modelValue, (open: boolean) => {
  if (open) {
    reason.value = ''
    description.value = ''
    sent.value = false
    error.value = ''
  }
})

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (reason.value.trim().length < 3) return
  try {
    await fileReport(props.entityType, reason.value.trim(), description.value.trim() || undefined, props.entityId)
    sent.value = true
  } catch {
    // error ya queda reflejado en el composable
  }
}
</script>
