<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg mr-3">
        <ComputerDesktopIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Sesiones Activas</h3>
    </div>

    <div v-if="loadingSessions" class="space-y-3">
      <div v-for="i in 2" :key="i" class="h-16 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <p v-else-if="sessions.length === 0" class="text-sm text-gray-500">
      No hay sesiones activas registradas.
    </p>

    <div v-else class="space-y-3">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="flex items-center justify-between gap-4 p-4 border-2 rounded-xl"
        :class="session.isCurrent ? 'border-green-200 bg-green-50' : 'border-gray-100'"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 bg-white rounded-lg border border-gray-200 shrink-0">
            <ComputerDesktopIcon class="h-5 w-5 text-gray-500" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">
              {{ deviceLabel(session.deviceInfo) }}
              <span v-if="session.isCurrent" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Sesión actual
              </span>
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ session.ipAddress || 'IP desconocida' }} · Conectado {{ formatSessionDate(session.createdAt) }}
            </p>
          </div>
        </div>
        <button
          v-if="!session.isCurrent"
          type="button"
          @click="revokeSession(session)"
          :disabled="revokingSessionId === session.id"
          class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
          title="Cerrar sesión"
        >
          <span v-if="revokingSessionId === session.id" class="block h-4 w-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
          <XMarkIcon v-else class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ComputerDesktopIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useAuth, type Session } from '~/composables/auth/useAuth'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useDateFormat } from '~/composables/core/useDateFormat'

const emit = defineEmits<{
  error: [err: unknown]
  success: [message: string]
}>()

const auth = useAuth()
const { confirm } = useConfirm()
const { formatDateTime } = useDateFormat()

const sessions = ref<Session[]>([])
const loadingSessions = ref(false)
const revokingSessionId = ref<string | null>(null)

async function fetchSessions() {
  loadingSessions.value = true
  try {
    sessions.value = await auth.getSessions()
  } catch (err) {
    emit('error', err)
  } finally {
    loadingSessions.value = false
  }
}

function deviceLabel(userAgent?: string | null): string {
  if (!userAgent) return 'Dispositivo desconocido'
  const ua = userAgent.toLowerCase()
  let os = 'Desconocido'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac os') || ua.includes('macintosh')) os = 'macOS'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
  else if (ua.includes('linux')) os = 'Linux'

  let browser = 'Navegador'
  if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome/')) browser = 'Chrome'
  else if (ua.includes('firefox/')) browser = 'Firefox'
  else if (ua.includes('safari/')) browser = 'Safari'

  return `${browser} en ${os}`
}

function formatSessionDate(value: string): string {
  return formatDateTime(value)
}

async function revokeSession(session: Session) {
  const ok = await confirm({
    title: '¿Cerrar esta sesión?',
    message: 'El dispositivo deberá iniciar sesión nuevamente.',
    confirmText: 'Sí, cerrar sesión',
    variant: 'danger',
  })
  if (!ok) return

  revokingSessionId.value = session.id
  try {
    await auth.revokeSession(session.id)
    sessions.value = sessions.value.filter((s) => s.id !== session.id)
    emit('success', 'Sesión cerrada correctamente')
  } catch (err) {
    emit('error', err)
  } finally {
    revokingSessionId.value = null
  }
}

onMounted(fetchSessions)
</script>
