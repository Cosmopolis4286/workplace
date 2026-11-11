<template>
  <div>
    <PageHeader
      title="Reportar un Problema"
      description="Cuéntanos qué pasó. Nuestro equipo revisará tu reporte y te dará seguimiento."
      :icon="ExclamationTriangleIcon"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Form -->
      <div class="lg:col-span-2">
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-workplace-red to-red-700 rounded-xl shadow-lg mr-3">
              <FlagIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Nuevo Reporte</h3>
          </div>

          <div v-if="sent" class="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium mb-4">
            <CheckCircleIcon class="h-5 w-5 flex-shrink-0" />
            Reporte enviado correctamente. Gracias por avisarnos — lo revisaremos pronto.
          </div>
          <div v-if="error" class="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium mb-4">
            <ExclamationCircleIcon class="h-5 w-5 flex-shrink-0" />
            {{ error }}
          </div>

          <form v-if="!sent" class="space-y-5" @submit.prevent="submit">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Motivo</label>
              <input
                v-model="reason"
                type="text"
                maxlength="200"
                placeholder="Ej: Error en la app, contenido inapropiado, problema de pago…"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
              >
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Descripción
                <span class="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                v-model="description"
                rows="5"
                maxlength="1000"
                placeholder="Cuéntanos más detalles, incluyendo cuándo ocurrió y qué esperabas que pasara…"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300 resize-none"
              />
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="sending || reason.trim().length < 3"
                class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span v-if="sending" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {{ sending ? 'Enviando…' : 'Enviar Reporte' }}
              </button>
            </div>
          </form>

          <div v-else class="flex justify-end">
            <button
              class="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
              @click="reset"
            >
              Enviar otro reporte
            </button>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="lg:col-span-1">
        <div class="card-premium p-6">
          <div class="flex items-center mb-4">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
              <ClockIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-lg font-bold text-gray-900">Mis Reportes</h3>
          </div>

          <div v-if="loadingHistory" class="space-y-3">
            <div v-for="i in 3" :key="i" class="h-16 bg-gray-100 rounded-xl animate-pulse" />
          </div>

          <p v-else-if="myReports.length === 0" class="text-sm text-gray-500">
            Aún no has enviado ningún reporte.
          </p>

          <div v-else class="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            <div
              v-for="report in myReports"
              :key="report.id"
              class="p-3 border border-gray-100 rounded-xl"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ report.reason }}</p>
                <span class="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="STATUS_CLASSES[report.status]">
                  {{ STATUS_LABELS[report.status] }}
                </span>
              </div>
              <p class="text-xs text-gray-400">{{ formatDate(report.createdAt) }}</p>
              <button
                type="button"
                class="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                @click="openChatId = openChatId === report.id ? null : report.id"
              >{{ openChatId === report.id ? 'Ocultar conversación' : 'Conversar con soporte' }}</button>
              <ConversationChat
                v-if="openChatId === report.id && currentUserId"
                class="mt-2"
                thread-type="REPORT"
                :thread-id="report.id"
                :current-user-id="currentUserId"
                title="Soporte WorkPlace"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ExclamationTriangleIcon,
  FlagIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useReports, type Report } from '~/composables/dashboard/useReports'
import { useDateFormat } from '~/composables/core/useDateFormat'
import ConversationChat from '~/components/conversations/ConversationChat.vue'
import { useAuth } from '~/composables/auth/useAuth'

const { user: chatUser } = useAuth()
const currentUserId = computed(() => chatUser.value?.id ?? '')
const openChatId = ref<string | null>(null)

definePageMeta({ middleware: 'auth' })

const { sending, error, fileReport, fetchMyReports } = useReports()
const { formatDateTime } = useDateFormat()
const reason = ref('')
const description = ref('')
const sent = ref(false)

const myReports = ref<Report[]>([])
const loadingHistory = ref(false)

const STATUS_LABELS: Record<Report['status'], string> = {
  PENDING: 'Pendiente',
  IN_REVIEW: 'En Revisión',
  RESOLVED: 'Resuelto',
  DISMISSED: 'Descartado',
}

const STATUS_CLASSES: Record<Report['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-gray-100 text-gray-600',
}

function formatDate(value: string): string {
  return formatDateTime(value)
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    myReports.value = await fetchMyReports()
  } catch {
    // error ya queda reflejado a nivel de carga; lista simplemente queda vacía
  } finally {
    loadingHistory.value = false
  }
}

async function submit() {
  if (reason.value.trim().length < 3) return
  try {
    await fileReport('GENERAL', reason.value.trim(), description.value.trim() || undefined)
    sent.value = true
    await loadHistory()
  } catch {
    // error ya queda reflejado en el composable
  }
}

function reset() {
  reason.value = ''
  description.value = ''
  sent.value = false
}

onMounted(loadHistory)
</script>
