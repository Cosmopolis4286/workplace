<template>
  <div v-if="available" class="card-premium p-6">
    <div class="flex items-start gap-3">
      <div class="p-3 bg-sky-500 rounded-xl shadow-lg flex-shrink-0">
        <PaperAirplaneIcon class="h-6 w-6 text-white" />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-bold text-gray-900">Avisos por Telegram</h3>
        <p class="text-xs text-gray-500 mt-1">
          Recibe en Telegram los avisos importantes (pedidos nuevos, pagos reportados) aunque tengas
          la app cerrada o mala señal. Telegram gasta muy pocos datos.
        </p>

        <p v-if="error" class="text-xs text-red-600 mt-2">{{ error }}</p>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <template v-if="linked">
            <span class="text-sm font-semibold text-emerald-700">✓ Vinculado</span>
            <button type="button" class="btn-secondary text-sm" :disabled="busy" @click="unlink">Desvincular</button>
          </template>
          <template v-else>
            <button type="button" class="btn-primary text-sm" :disabled="busy" @click="link">
              {{ busy ? 'Abriendo…' : 'Vincular Telegram' }}
            </button>
            <button v-if="waiting" type="button" class="text-xs text-gray-500 underline" @click="load">
              Ya lo vinculé
            </button>
          </template>
        </div>
        <p v-if="waiting && !linked" class="text-xs text-gray-500 mt-2">
          Toca <b>Iniciar</b> en el chat que se abrió y vuelve aquí. El enlace vale 24 horas.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PaperAirplaneIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

// Respaldo gratis del push: el bot de WorkPlace manda los avisos que piden
// acción. Solo se muestra si el bot está configurado (TELEGRAM_BOT_USERNAME).
const { get, post, del } = useApi()
const available = ref(false)
const linked = ref(false)
const busy = ref(false)
const waiting = ref(false)
const error = ref<string | null>(null)

async function load() {
  try {
    const status = await get<{ linked: boolean; available: boolean }>('/telegram/me')
    available.value = status.available
    linked.value = status.linked
    if (status.linked) waiting.value = false
  } catch {
    available.value = false
  }
}

async function link() {
  busy.value = true
  error.value = null
  try {
    const { url } = await post<{ url: string | null }>('/telegram/me/link', {})
    if (!url) throw new Error('El bot de Telegram no está configurado')
    window.open(url, '_blank', 'noopener')
    waiting.value = true
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo generar el enlace')
  } finally {
    busy.value = false
  }
}

async function unlink() {
  busy.value = true
  error.value = null
  try {
    await del('/telegram/me')
    linked.value = false
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo desvincular')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>
