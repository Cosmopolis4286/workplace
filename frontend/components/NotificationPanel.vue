<template>
  <div class="relative" ref="panelRef">
    <!-- Bell button -->
    <button
      @click="togglePanel"
      class="relative p-3 text-gray-400 hover:text-workplace-red hover:bg-red-50 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
    >
      <BellIcon class="h-6 w-6" :class="{ 'animate-bounce': hasNewNotification }" />
      <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 flex h-5 w-5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-workplace-red opacity-75"></span>
        <span class="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-gradient-to-r from-workplace-red to-red-600 shadow-lg text-white text-xs font-bold">
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </span>
    </button>

    <!-- Panel -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95 translate-y-2"
      enter-to-class="transform opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="transform opacity-100 scale-100 translate-y-0"
      leave-to-class="transform opacity-0 scale-95 translate-y-2"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
      >
        <!-- Header -->
        <div class="px-4 py-3 bg-gradient-to-r from-workplace-red to-red-600 text-white">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <BellIcon class="h-5 w-5" />
              <h3 class="text-lg font-bold">Notificaciones</h3>
              <span v-if="unreadCount > 0" class="px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                {{ unreadCount }} nueva{{ unreadCount !== 1 ? 's' : '' }}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <button
                @click="reloadNotifications"
                :disabled="loading"
                class="p-1 hover:bg-white/20 rounded-lg transition-colors duration-200 disabled:opacity-50"
                title="Recargar"
              >
                <ArrowPathIcon class="h-4 w-4" :class="{ 'animate-spin': loading }" />
              </button>
              <button @click="togglePanel" class="p-1 hover:bg-white/20 rounded-lg transition-colors duration-200">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <!-- WS offline warning -->
        <div v-if="wsOffline" class="px-4 py-2 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2 text-xs text-yellow-700">
          <ExclamationTriangleIcon class="h-4 w-4 flex-shrink-0" />
          Tiempo real no disponible — actualizando manualmente
        </div>

        <!-- Error banner -->
        <div v-if="error" class="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-700">
          <ExclamationTriangleIcon class="h-4 w-4 flex-shrink-0" />
          {{ error }}
        </div>

        <!-- List -->
        <div class="max-h-[28rem] overflow-y-auto">
          <div v-if="loading && notifications.length === 0" class="p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-workplace-red"></div>
            <p class="mt-2 text-sm text-gray-500">Cargando notificaciones...</p>
          </div>

          <div v-else-if="notifications.length === 0" class="p-8 text-center">
            <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <BellIcon class="h-8 w-8 text-gray-400" />
            </div>
            <p class="text-gray-600 font-medium">Sin notificaciones</p>
            <p class="text-sm text-gray-500 mt-1">Te avisaremos cuando haya algo nuevo</p>
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="group relative hover:bg-gradient-to-r hover:from-gray-50 hover:to-red-50/30 transition-all duration-200"
              :class="{ 'bg-blue-50/30': !notification.read }"
            >
              <div class="p-4 cursor-pointer" @click="handleNotificationClick(notification)">
                <div class="flex gap-3">
                  <div
                    :class="[
                      'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                      getIconColorClass(notification.color)
                    ]"
                  >
                    <component :is="getIconComponent(notification.icon)" class="h-5 w-5" />
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <h4 :class="['text-sm font-semibold truncate', notification.read ? 'text-gray-600' : 'text-gray-900']">
                        {{ notification.title }}
                      </h4>
                      <span v-if="!notification.read" class="flex-shrink-0 w-2 h-2 mt-1 bg-workplace-red rounded-full"></span>
                    </div>
                    <p :class="['text-sm mt-1 line-clamp-2', notification.read ? 'text-gray-500' : 'text-gray-700']">
                      {{ notification.message }}
                    </p>
                    <p class="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <ClockIcon class="h-3 w-3" />
                      {{ formatTime(notification.createdAt) }}
                    </p>
                  </div>

                  <button
                    @click.stop="deleteNotification(notification.id)"
                    class="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Eliminar"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          v-if="notifications.length > 0"
          class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2"
        >
          <button
            v-if="unreadCount > 0"
            @click="handleMarkAllAsRead"
            class="flex-1 px-3 py-2 text-sm font-medium text-workplace-red hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            Marcar todas como leídas
          </button>
          <button
            @click="handleClearAll"
            class="flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  BellIcon,
  XMarkIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  TruckIcon,
  CalendarIcon,
  BanknotesIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNotifications } from '~/composables/useNotifications'
import { useAuth } from '~/composables/useAuth'
import { useAlert } from '~/composables/useAlert'

const alert = useAlert()
const {
  notifications,
  loading,
  error,
  unreadCount,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
  init,
  disconnectWebSocket,
} = useNotifications()

const { commerce } = useAuth()

const isOpen             = ref(false)
const wsOffline          = ref(false)
const hasNewNotification = ref(false)
const panelRef           = ref<HTMLElement | null>(null)

function togglePanel() {
  isOpen.value = !isOpen.value
}

function handleClickOutside(event: MouseEvent) {
  if (panelRef.value && !panelRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

async function handleNotificationClick(notification: any) {
  await markAsRead(notification.id)
  if (notification.link) {
    await navigateTo(notification.link)
    isOpen.value = false
  }
}

async function handleMarkAllAsRead() {
  await markAllAsRead()
}

async function handleClearAll() {
  const result = await alert.confirm(
    'Eliminar notificaciones',
    '¿Estás seguro de que quieres eliminar todas las notificaciones?',
    'Eliminar todas', 'Cancelar',
  )
  if (result.isConfirmed) {
    await clearAll()
  }
}

async function reloadNotifications() {
  await fetchNotifications({ limit: 30 })
}

// Animate bell when a new unread arrives
watch(unreadCount, (newVal, oldVal) => {
  if (newVal > (oldVal ?? 0)) {
    hasNewNotification.value = true
    setTimeout(() => { hasNewNotification.value = false }, 2000)
  }
})

// ── Icon helpers ──────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, any> = {
  ShoppingBagIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  BellIcon,
  CalendarIcon,
  BanknotesIcon,
}

function getIconComponent(iconName: string) {
  return ICON_MAP[iconName] ?? BellIcon
}

function getIconColorClass(color: string): string {
  const map: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-600',
    green:  'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red:    'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    gray:   'bg-gray-100 text-gray-600',
  }
  return map[color] ?? map.gray
}

function formatTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: es })
  } catch {
    return 'Hace un momento'
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let stopWatch: (() => void) | null = null

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  const commerceId = commerce.value?.id
  if (commerceId) {
    try {
      await init(commerceId)
      wsOffline.value = false
    } catch {
      wsOffline.value = true
      await fetchNotifications({ limit: 30 })
    }
  } else {
    stopWatch = watch(commerce, async (r) => {
      if (r?.id) {
        stopWatch?.()
        try {
          await init(r.id)
          wsOffline.value = false
        } catch {
          wsOffline.value = true
          await fetchNotifications({ limit: 30 })
        }
      }
    })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  stopWatch?.()
  disconnectWebSocket()
})
</script>
