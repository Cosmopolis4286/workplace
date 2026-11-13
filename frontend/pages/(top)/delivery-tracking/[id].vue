<template>
  <div>
    <PageHeader
      title="Seguimiento de entrega"
      description="Ubicación en tiempo real de tu pedido"
      :icon="MapPinIcon"
      :breadcrumb="[{ label: 'Mis Pedidos', to: '/my-orders?tab=deliveries' }, { label: 'Seguimiento' }]"
    />

    <div v-if="loading" class="card p-8 text-center text-gray-500">Cargando seguimiento…</div>

    <div v-else-if="error" class="card p-8 text-center text-red-600">{{ error }}</div>

    <template v-else-if="snapshot">
      <!-- Progreso: en qué paso va y qué falta -->
      <div v-if="!isClosedBad" class="card p-4 mb-4">
        <ol class="flex items-center gap-1">
          <li v-for="(step, i) in STEPS" :key="step.status" class="flex-1">
            <div class="h-1.5 rounded-full" :class="i <= stepIndex ? 'bg-emerald-500' : 'bg-gray-200'" />
            <p class="mt-1.5 text-[11px] leading-tight" :class="i === stepIndex ? 'font-semibold text-gray-900' : 'text-gray-400'">
              {{ step.label }}
            </p>
          </li>
        </ol>
      </div>
      <div v-else class="card p-4 mb-4 bg-red-50 border border-red-200 text-sm text-red-800">
        {{ snapshot.status === 'CANCELLED' ? 'La entrega fue cancelada por el comercio.' : 'No se pudo completar la entrega.' }}
        <span v-if="snapshot.chatAvailable"> Revisa el chat o reporta el problema abajo.</span>
      </div>

      <div class="card p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p class="text-sm text-gray-500">Estado</p>
          <p class="font-semibold text-gray-900">{{ statusLabel }}</p>
        </div>

        <div v-if="snapshot.driver" class="flex items-center gap-2">
          <span class="text-2xl">{{ vehicleEmoji }}</span>
          <div>
            <p class="font-semibold text-gray-900">{{ snapshot.driver.name }}</p>
            <p class="text-xs text-gray-500">{{ vehicleLabel }}</p>
          </div>
        </div>

        <div v-if="snapshot.route" class="text-right">
          <p class="text-sm text-gray-500">ETA</p>
          <p class="font-semibold text-gray-900">{{ etaLabel }}</p>
          <p class="text-xs text-gray-500">{{ distanceLabel }}</p>
        </div>
      </div>

      <div v-if="snapshot.deliveryCode && !['DELIVERED', 'CANCELLED', 'FAILED'].includes(snapshot.status)" class="card p-4 mb-4 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200">
        <p class="text-sm text-emerald-900">
          <strong>Tu código de entrega.</strong> Dáselo al repartidor solo cuando recibas tu pedido.
        </p>
        <span class="font-mono text-2xl font-black tracking-[0.3em] text-emerald-900">{{ snapshot.deliveryCode }}</span>
      </div>

      <div v-if="!isTrackable" class="card p-4 mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        El seguimiento en vivo no está disponible para esta entrega en este momento.
      </div>

      <div class="card p-0 h-[420px] mb-4">
        <ClientOnly>
          <DeliveryTrackingMap
            :pickup="snapshot.pickup"
            :destination="snapshot.destination"
            :location="snapshot.location"
            :route="snapshot.route"
            :trail="trail"
          />
          <template #fallback>
            <div class="h-full flex items-center justify-center text-gray-400">Cargando mapa…</div>
          </template>
        </ClientOnly>
      </div>

      <!-- Calificación al repartidor (cliente, una vez entregado) -->
      <div v-if="snapshot.viewerRole === 'CUSTOMER' && feedback" class="card p-4 mb-4">
        <template v-if="feedback.rating">
          <p class="text-sm text-gray-700">
            Calificaste al repartidor con
            <span class="text-amber-500">{{ '★'.repeat(feedback.rating.stars) }}</span>. ¡Gracias!
          </p>
        </template>
        <form v-else-if="feedback.canRate" class="space-y-3" @submit.prevent="submitRating">
          <p class="font-semibold text-gray-900">¿Cómo te fue con {{ snapshot.driver?.name ?? 'el repartidor' }}?</p>
          <div class="flex gap-1" role="radiogroup" aria-label="Calificación">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="text-3xl leading-none"
              :class="n <= stars ? 'text-amber-400' : 'text-gray-300'"
              :aria-label="`${n} estrella${n > 1 ? 's' : ''}`"
              @click="stars = n"
            >
              ★
            </button>
          </div>
          <textarea
            v-model="comment"
            rows="2"
            maxlength="500"
            class="input-field resize-none"
            placeholder="Comentario opcional (sin teléfonos ni correos)"
          />
          <p v-if="ratingError" class="text-sm text-red-600">{{ ratingError }}</p>
          <button type="submit" class="btn-primary text-sm" :disabled="!stars || rating">
            {{ rating ? 'Enviando…' : 'Enviar calificación' }}
          </button>
        </form>
      </div>

      <!-- Chat de la entrega: reemplaza el intercambio de teléfonos -->
      <ConversationChat
        v-if="snapshot.chatAvailable && user && snapshot.viewerRole !== 'DRIVER'"
        class="mb-4"
        thread-type="DELIVERY"
        :thread-id="deliveryId"
        :current-user-id="user.id"
        :title="snapshot.viewerRole === 'CUSTOMER' ? 'Chat con el repartidor y el comercio' : 'Chat de la entrega'"
        hint="Por seguridad, no compartas teléfonos ni correos: todo queda aquí."
        :quick-replies="snapshot.viewerRole === 'CUSTOMER' ? CUSTOMER_QUICK_REPLIES : []"
        :read-only="isFinished"
        read-only-text="La entrega terminó: el chat quedó como historial. Si hubo un problema, repórtalo."
        show-sender-names
      />

      <button class="text-xs text-gray-400 hover:text-red-600 hover:underline" @click="showReport = true">
        Reportar un problema con esta entrega
      </button>
      <ReportProblemModal v-model="showReport" entity-type="DELIVERY" :entity-id="deliveryId" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { MapPinIcon } from '@heroicons/vue/24/outline'
import ConversationChat from '~/components/conversations/ConversationChat.vue'
import ReportProblemModal from '~/components/modals/ReportProblemModal.vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const deliveryId = route.params.id as string

const { snapshot, loading, error, isTrackable, trail, init } = useDeliveryTracking(deliveryId)
const { user } = useAuth()
const { get, post } = useApi()
const showReport = ref(false)

const STEPS = [
  { status: 'PENDING', label: 'Preparando' },
  { status: 'ASSIGNED', label: 'Repartidor asignado' },
  { status: 'PICKING_UP', label: 'Recogiendo' },
  { status: 'IN_TRANSIT', label: 'En camino' },
  { status: 'DELIVERED', label: 'Entregado' },
]
const stepIndex = computed(() => STEPS.findIndex(s => s.status === snapshot.value?.status))
const isClosedBad = computed(() => ['CANCELLED', 'FAILED'].includes(snapshot.value?.status ?? ''))
const isFinished = computed(() => ['DELIVERED', 'CANCELLED', 'FAILED'].includes(snapshot.value?.status ?? ''))

const CUSTOMER_QUICK_REPLIES = [
  'Ya bajo',
  'Estoy en camino a la puerta',
  'Déjalo en la recepción / conserjería',
  '¿Cuánto te falta?',
]

// Calificación (solo el cliente, una vez entregado).
interface DeliveryFeedback {
  rating: { stars: number; comment: string | null } | null
  canRate: boolean
}
const feedback = ref<DeliveryFeedback | null>(null)
const stars = ref(0)
const comment = ref('')
const rating = ref(false)
const ratingError = ref('')

async function loadFeedback() {
  if (snapshot.value?.viewerRole !== 'CUSTOMER' || snapshot.value.status !== 'DELIVERED') return
  feedback.value = await get<DeliveryFeedback | null>(`/delivery/${deliveryId}/rating`).catch(() => null)
}

async function submitRating() {
  if (!stars.value || rating.value) return
  rating.value = true
  ratingError.value = ''
  try {
    await post(`/delivery/${deliveryId}/rating`, { stars: stars.value, comment: comment.value.trim() || undefined })
    feedback.value = { rating: { stars: stars.value, comment: comment.value.trim() || null }, canRate: false }
  } catch (e: unknown) {
    ratingError.value = getApiErrorMessage(e, 'No se pudo enviar la calificación')
  } finally {
    rating.value = false
  }
}

// Al llegar a "Entregado" (en vivo por WebSocket) aparece la calificación.
watch(() => snapshot.value?.status, () => { loadFeedback() })

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Preparando pedido',
  ASSIGNED: 'Repartidor asignado',
  PICKING_UP: 'En camino a recoger',
  IN_TRANSIT: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelada',
  FAILED: 'Entrega fallida',
}

const VEHICLE_LABELS: Record<string, { label: string; emoji: string }> = {
  MOTORCYCLE: { label: 'Moto', emoji: '🏍️' },
  CAR: { label: 'Auto', emoji: '🚗' },
  BICYCLE: { label: 'Bicicleta', emoji: '🚲' },
  ELECTRIC_BICYCLE: { label: 'Bicicleta eléctrica', emoji: '🚲' },
  SCOOTER: { label: 'Scooter', emoji: '🛵' },
  ON_FOOT: { label: 'A pie', emoji: '🚶' },
}

const statusLabel = computed(() => STATUS_LABELS[snapshot.value?.status ?? ''] ?? snapshot.value?.status)
const vehicleInfo = computed(() => VEHICLE_LABELS[snapshot.value?.driver?.vehicleType ?? ''] ?? { label: '', emoji: '📦' })
const vehicleLabel = computed(() => vehicleInfo.value.label)
const vehicleEmoji = computed(() => vehicleInfo.value.emoji)

const etaLabel = computed(() => {
  const seconds = snapshot.value?.route?.durationSeconds
  if (!seconds) return '—'
  const minutes = Math.round(seconds / 60)
  return minutes <= 1 ? '< 1 min' : `${minutes} min`
})

const distanceLabel = computed(() => {
  const meters = snapshot.value?.route?.distanceMeters
  if (!meters) return ''
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
})

onMounted(() => init())
</script>
