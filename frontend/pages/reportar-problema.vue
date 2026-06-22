<template>
  <div class="max-w-xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-black text-gray-900 mb-1">Reportar un problema</h1>
    <p class="text-sm text-gray-500 mb-6">Cuéntanos qué pasó. Nuestro equipo revisará tu reporte y te dará seguimiento.</p>

    <div class="card-premium p-6 space-y-4">
      <div>
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivo</label>
        <input
          v-model="reason"
          type="text"
          maxlength="200"
          placeholder="Ej: Error en la app, contenido inapropiado, problema de pago…"
          class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-200"
        />
      </div>

      <div>
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción (opcional)</label>
        <textarea
          v-model="description"
          rows="5"
          maxlength="1000"
          placeholder="Cuéntanos más detalles, incluyendo cuándo ocurrió y qué esperabas que pasara…"
          class="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
        />
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div v-if="sent" class="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
        Reporte enviado correctamente. Gracias por avisarnos — lo revisaremos pronto.
      </div>

      <button
        v-if="!sent"
        :disabled="sending || reason.trim().length < 3"
        class="w-full bg-workplace-red text-white font-semibold py-3 rounded-xl hover:bg-red-700 disabled:opacity-60 text-sm"
        @click="submit"
      >
        {{ sending ? 'Enviando…' : 'Enviar reporte' }}
      </button>
      <button
        v-else
        class="w-full border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 text-sm"
        @click="reset"
      >
        Enviar otro reporte
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useReports } from '~/composables/useReports'

definePageMeta({ middleware: 'auth' })

const { sending, error, fileReport } = useReports()
const reason = ref('')
const description = ref('')
const sent = ref(false)

async function submit() {
  if (reason.value.trim().length < 3) return
  try {
    await fileReport('GENERAL', reason.value.trim(), description.value.trim() || undefined)
    sent.value = true
  } catch {
    // error ya queda reflejado en el composable
  }
}

function reset() {
  reason.value = ''
  description.value = ''
  sent.value = false
}
</script>
