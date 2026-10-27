<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />

        <div class="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

          <!-- Header -->
          <div class="flex items-start justify-between px-5 py-4 border-b border-gray-100">
            <div class="flex items-center gap-3 min-w-0">
              <img
                v-if="contactAvatarUrl"
                :src="contactAvatarUrl"
                class="h-9 w-9 rounded-full object-cover flex-shrink-0 ring-1 ring-inset ring-gray-100"
              />
              <div
                v-else
                class="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ring-1 ring-inset"
                :class="isProvider ? 'bg-red-50 text-red-600 ring-red-100' : 'bg-blue-50 text-blue-600 ring-blue-100'"
              >
                {{ contactInitial }}
              </div>
              <div class="min-w-0">
                <h2 class="text-[15px] font-semibold text-gray-900 truncate tracking-tight">{{ req.serviceName }}</h2>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ isProvider ? req.clientName : req.providerName }}
                  <span class="text-gray-300 mx-1">·</span>
                  <span :title="formatDateTime(req.createdAt)">{{ timeAgo(req.createdAt) }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0 ml-3">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" :class="STATUS_CLASSES[req.status]">
                <component :is="STATUS_ICONS[req.status]" class="h-3 w-3" />
                {{ STATUS_LABELS[req.status] }}
              </span>
              <button class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" @click="$emit('close')">
                <XMarkIcon class="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <!-- Body scrollable -->
          <div class="flex-1 overflow-y-auto">
            <div class="p-5 space-y-4">

              <!-- Grid info principal -->
              <div class="grid grid-cols-2 gap-3 bg-gray-50/70 rounded-xl p-4">
                <div>
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Modalidad</p>
                  <p class="text-sm text-gray-900 font-medium">{{ MODALITY_LABELS[req.modality] ?? req.modality }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Fecha preferida</p>
                  <p class="text-sm text-gray-900 font-medium">{{ formatDate(req.preferredDate) }}</p>
                </div>
                <div v-if="req.price != null">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Precio acordado</p>
                  <p class="text-sm text-gray-900 font-medium">${{ formatPrice(req.price) }}{{ req.priceUnit ? ' / ' + req.priceUnit : '' }}</p>
                  <p v-if="defaultRate" class="text-xs text-gray-400 font-medium">
                    {{ formatConversion(req.price, defaultRate) }}{{ req.priceUnit ? ` / ${req.priceUnit}` : '' }}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Solicitud creada</p>
                  <p class="text-sm text-gray-900 font-medium" :title="formatDateTime(req.createdAt)">{{ timeAgo(req.createdAt) }}</p>
                  <p class="text-xs text-gray-400">{{ formatDateTime(req.createdAt) }}</p>
                </div>
              </div>

              <!-- Comisión de plataforma — proveedor: lo que descuenta su billetera -->
              <div v-if="isProvider && req.platformFeePayer === 'PROVIDER' && req.platformFeeAmount" class="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-amber-700 font-semibold">Precio acordado</span>
                  <span class="text-gray-700 font-medium">${{ formatPrice(req.price ?? 0) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-amber-700 font-semibold">Comisión de plataforma ({{ req.platformFeeRate }}%)</span>
                  <span class="text-red-600 font-medium">-${{ formatPrice(req.platformFeeAmount) }}</span>
                </div>
                <div class="h-px bg-amber-200" />
                <div class="flex items-center justify-between text-sm">
                  <span class="text-amber-800 font-bold">Recibirás</span>
                  <span class="text-amber-800 font-bold">${{ formatPrice((req.price ?? 0) - req.platformFeeAmount) }}</span>
                </div>
              </div>

              <!-- Comisión de plataforma — cliente: por qué el precio final incluye un cargo -->
              <div v-if="!isProvider && req.platformFeePayer === 'CLIENT' && req.platformFeeAmount" class="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-blue-700 font-semibold">Precio base del servicio</span>
                  <span class="text-gray-700 font-medium">${{ formatPrice((req.price ?? 0) - req.platformFeeAmount) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-blue-700 font-semibold">Tasa de servicio ({{ req.platformFeeRate }}%)</span>
                  <span class="text-gray-700 font-medium">+${{ formatPrice(req.platformFeeAmount) }}</span>
                </div>
                <div class="h-px bg-blue-200" />
                <div class="flex items-center justify-between text-sm">
                  <span class="text-blue-800 font-bold">Total a pagar</span>
                  <span class="text-blue-800 font-bold">${{ formatPrice(req.price ?? 0) }}</span>
                </div>
              </div>

              <!-- Garantía de plataforma (escrow) -->
              <div v-if="req.escrowStatus && req.escrowStatus !== 'NONE'" class="rounded-xl p-4 border" :class="ESCROW_CLASSES[req.escrowStatus]">
                <div class="flex items-start gap-2.5">
                  <component :is="ESCROW_ICONS[req.escrowStatus]" class="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold">{{ ESCROW_LABELS[req.escrowStatus] }}</p>
                    <p class="text-xs mt-0.5 opacity-90">{{ escrowDescription }}</p>
                  </div>
                  <span v-if="req.escrowAmount != null" class="text-sm font-bold flex-shrink-0">${{ formatPrice(req.escrowAmount) }}</span>
                </div>
                <button
                  v-if="!isProvider && req.escrowStatus === 'PENDING_FUNDS'"
                  type="button"
                  class="mt-2.5 w-full text-xs font-semibold py-1.5 rounded-lg bg-white/70 hover:bg-white transition-colors"
                  @click="goToWallet"
                >
                  Ir a cargar saldo
                </button>
              </div>

              <!-- Ubicación (presencial) -->
              <div v-if="req.address" class="flex items-start gap-2.5 bg-gray-50/70 rounded-xl px-4 py-3">
                <MapPinIcon class="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Ubicación</p>
                  <p class="text-sm text-gray-800">{{ req.address }}{{ req.city ? `, ${req.city}` : '' }}</p>
                </div>
              </div>

              <!-- Descripción del cliente -->
              <div v-if="req.description" class="flex items-start gap-2.5 bg-blue-50/60 ring-1 ring-blue-100/80 rounded-xl px-4 py-3">
                <ChatBubbleLeftIcon class="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div class="min-w-0">
                  <p class="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-0.5">Descripción del cliente</p>
                  <p class="text-sm text-gray-700 italic leading-relaxed">"{{ req.description }}"</p>
                </div>
              </div>

              <ServiceRequestItemsList
                :items="req.items"
                :media-url="mediaUrl"
                :media-load-failed="mediaLoadFailed"
                @open-lightbox="openLightbox"
              />

              <!-- Datos de contacto (solo proveedor) -->
              <div v-if="isProvider" class="border border-gray-100 rounded-xl p-4">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Datos de contacto</p>
                <div class="space-y-2">
                  <div class="flex items-center gap-2.5">
                    <UserIcon class="h-3.5 w-3.5 text-gray-400" />
                    <span class="text-sm text-gray-900 font-medium">{{ req.clientName }}</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <PhoneIcon class="h-3.5 w-3.5 text-gray-400" />
                    <a :href="`tel:${req.clientPhone}`" class="text-sm text-blue-600 hover:underline font-medium">{{ req.clientPhone }}</a>
                  </div>
                  <div v-if="req.clientEmail" class="flex items-center gap-2.5">
                    <EnvelopeIcon class="h-3.5 w-3.5 text-gray-400" />
                    <a :href="`mailto:${req.clientEmail}`" class="text-sm text-blue-600 hover:underline">{{ req.clientEmail }}</a>
                  </div>
                </div>
              </div>

              <ServiceRequestTimeline
                :status="req.status"
                :created-at="req.createdAt"
                :status-updated-at="req.statusUpdatedAt"
                :format-date-time="formatDateTime"
                :time-ago="timeAgo"
              />

              <ServiceRequestNotesEditor
                :request-id="req.id"
                :is-provider="isProvider"
                :provider-notes="req.providerNotes"
                :price="req.price"
                :price-unit="req.priceUnit"
                :suggested-price="req.suggestedPrice"
                :suggested-price-based-on="req.suggestedPriceBasedOn"
                :format-price="formatPrice"
                @updated="onNotesUpdated"
                @error="actionError = $event"
              />

              <!-- Ítems adicionales y aumento de precio: sección separada de "Observaciones" a
                   propósito — una nota informal no mueve dinero, una propuesta sí, y requiere
                   aprobación explícita del cliente antes de tocar el escrow. -->
              <ServiceRequestPriceProposal
                ref="priceProposalRef"
                :request-id="req.id"
                :is-provider="isProvider"
                :status="req.status"
                :price="req.price"
                :format-price="formatPrice"
                @approved="onProposalApproved"
                @error="actionError = $event"
              />

              <ServiceRequestChat
                :request-id="req.id"
                :active="show"
                :current-user-id="currentUserId"
                :contact-name="isProvider ? req.clientName : req.providerName"
                :time-ago="timeAgo"
              />

            </div>
          </div>

          <!-- Error de acción -->
          <div v-if="actionError" class="mx-4 mb-2 mt-0 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
            <XCircleIcon class="h-3.5 w-3.5 flex-shrink-0" />
            <span class="flex-1">{{ actionError }}</span>
            <button class="ml-1 text-red-400 hover:text-red-600" @click="clearError"><XMarkIcon class="h-3.5 w-3.5" /></button>
          </div>

          <!-- Footer acciones — proveedor -->
          <div v-if="isProvider && nextActions.length > 0" class="p-4 border-t border-gray-100 bg-gray-50">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <p class="text-xs text-gray-500">Cambiar estado:</p>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="action in nextActions"
                  :key="action.status"
                  :disabled="updating"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  :class="action.class"
                  @click="doStatusChange(action.status)"
                >
                  <component :is="action.icon" class="h-4 w-4" />
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Footer estado completado — proveedor -->
          <div v-else-if="isProvider && req.status === 'CLOSED'" class="p-4 border-t border-gray-100 bg-green-50">
            <div class="flex items-center gap-2">
              <CheckCircleIcon class="h-4 w-4 text-green-600 flex-shrink-0" />
              <p class="text-xs text-green-700 font-medium">Servicio completado. Puedes dejar observaciones finales si lo deseas.</p>
            </div>
          </div>

          <!-- Footer esperando confirmación del cliente — proveedor (CONTACTED) -->
          <div v-else-if="isProvider && req.status === 'CONTACTED'" class="p-4 border-t border-gray-100 bg-blue-50">
            <div class="flex items-center gap-2">
              <InformationCircleIcon class="h-4 w-4 text-blue-500 flex-shrink-0" />
              <p class="text-xs text-blue-700">Esperando que el cliente confirme la finalización del servicio.</p>
            </div>
          </div>

          <!-- Footer estado rechazado — proveedor -->
          <div v-else-if="isProvider && req.status === 'REJECTED'" class="p-4 border-t border-gray-100 bg-red-50">
            <div class="flex items-center gap-2">
              <XCircleIcon class="h-4 w-4 text-red-600 flex-shrink-0" />
              <p class="text-xs text-red-700 font-medium">Rechazaste esta solicitud.</p>
            </div>
          </div>

          <!-- Footer — cliente: confirmar finalización -->
          <div v-else-if="!isProvider && req.status === 'CONTACTED'" class="p-4 border-t border-gray-100 bg-blue-50">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-start gap-2">
                <InformationCircleIcon class="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p class="text-xs text-blue-700">
                  El proveedor ya se contactó contigo. Cuando recibas el servicio, confirma para poder dejar tu reseña.
                </p>
              </div>
              <button
                :disabled="confirming"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex-shrink-0"
                @click="confirmCompletion"
              >
                <CheckCircleIcon class="h-4 w-4" />
                {{ confirming ? 'Confirmando…' : 'Confirmar recibido' }}
              </button>
            </div>
          </div>

          <!-- Footer — cliente (solo lectura / cancelar, PENDING/SEEN/CANCELLED) -->
          <div v-else-if="!isProvider" class="p-4 border-t border-gray-100 bg-blue-50">
            <div v-if="confirmingCancel" class="space-y-2">
              <p class="text-xs text-gray-700 font-medium">¿Seguro? Esta acción no se puede deshacer.</p>
              <div class="flex justify-end gap-2">
                <button class="btn-secondary text-xs py-1.5 px-3" :disabled="cancelling" @click="confirmingCancel = false">No</button>
                <button class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" :disabled="cancelling" @click="cancelRequest">
                  {{ cancelling ? 'Cancelando…' : 'Sí, cancelar' }}
                </button>
              </div>
            </div>
            <div v-else class="flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-start gap-2">
                <InformationCircleIcon class="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p class="text-xs text-blue-700">
                  <template v-if="req.status === 'PENDING'">Tu solicitud está en espera de respuesta del proveedor.</template>
                  <template v-else-if="req.status === 'SEEN'">El proveedor ya vio tu solicitud y pronto se pondrá en contacto.</template>
                  <template v-else-if="req.status === 'CANCELLED'">Cancelaste esta solicitud.</template>
                  <template v-else-if="req.status === 'REJECTED'">El proveedor no podrá atender esta solicitud. Puedes buscar otro proveedor.</template>
                  <template v-else>Este servicio fue cerrado/completado. Ya puedes dejar una reseña verificada en el perfil del proveedor.</template>
                </p>
              </div>
              <button
                v-if="canCancel"
                class="text-xs font-semibold text-gray-500 hover:text-red-600 flex-shrink-0"
                @click="confirmingCancel = true"
              >
                Cancelar solicitud
              </button>
            </div>
          </div>

          <!-- Reportar problema (cliente) -->
          <div v-if="!isProvider && !['CANCELLED', 'REJECTED'].includes(req.status)" class="px-4 pb-3 text-center">
            <button class="text-xs text-gray-400 hover:text-red-500 font-medium" @click="showReportModal = true">
              ¿Tuviste un problema con esta solicitud? Reportarlo
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>

  <MediaLightbox
    :show="lightbox"
    :media="lightboxMedia"
    :index="lightboxIndex"
    :media-url="mediaUrl"
    @close="closeLightbox"
    @prev="lightboxPrev"
    @next="lightboxNext"
    @select="lightboxIndex = $event"
  />

  <ReportProblemModal v-model="showReportModal" entity-type="SERVICE_REQUEST" :entity-id="req.id" />
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import {
  XMarkIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  PhoneArrowUpRightIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { useAuth } from '~/composables/auth/useAuth'
import { useExchangeRates } from '~/composables/wallets/useExchangeRates'
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import ReportProblemModal from '~/components/modals/ReportProblemModal.vue'
import MediaLightbox, { type MediaEntry } from '~/components/modals/service-request/MediaLightbox.vue'
import ServiceRequestTimeline from '~/components/modals/service-request/ServiceRequestTimeline.vue'
import ServiceRequestChat from '~/components/modals/service-request/ServiceRequestChat.vue'
import ServiceRequestNotesEditor from '~/components/modals/service-request/ServiceRequestNotesEditor.vue'
import ServiceRequestPriceProposal from '~/components/modals/service-request/ServiceRequestPriceProposal.vue'
import ServiceRequestItemsList from '~/components/modals/service-request/ServiceRequestItemsList.vue'
import type { ServiceRequestPriceChangeProposal } from '~/composables/services/useServiceRequestPriceProposals'
import {
  type ServiceRequestStatus,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_CLASSES,
  SERVICE_REQUEST_STATUS_ICONS,
} from '~/config/serviceRequestStatus.config'

interface ServiceRequestItem {
  id: string
  fields: Record<string, string>
  notes?: string
  photos: string[]
  videos: string[]
}

interface ServiceRequest {
  id: string
  serviceName: string
  providerName: string
  modality: string
  preferredDate: string
  address?: string
  city?: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  description?: string
  price?: number
  priceUnit?: string
  providerNotes?: string
  status: ServiceRequestStatus
  createdAt: string
  statusUpdatedAt?: string
  items?: ServiceRequestItem[]
  suggestedPrice?: number | null
  suggestedPriceBasedOn?: number
  platformFeeRate?: number | null
  platformFeeAmount?: number | null
  platformFeePayer?: 'CLIENT' | 'PROVIDER' | null
  escrowStatus?: 'NONE' | 'HELD' | 'PENDING_FUNDS' | 'RELEASED' | 'REFUNDED'
  escrowAmount?: number | null
  escrowHeldAt?: string | null
  providerAvatar?: string | null
  clientAvatar?: string | null
}

const props = defineProps<{ show: boolean; req: ServiceRequest; isProvider: boolean }>()
const emit = defineEmits<{ close: []; updated: [ServiceRequest] }>()

const { defaultRate, formatConversion, fetchRates } = useExchangeRates()
const { getAssetUrl } = useAssetUrl()
const { user: currentUser } = useAuth()
const currentUserId = computed(() => currentUser.value?.id ?? '')

const contactAvatarUrl = computed(() =>
  getAssetUrl(props.isProvider ? props.req.clientAvatar : props.req.providerAvatar)
)

// Media de la solicitud (fotos/videos) es privada: se sirve solo tras auth vía
// /services/requests/media/:filename. Se descarga como blob y se expone como
// object URL local; las URLs se revocan al cambiar de solicitud o desmontar.
// loadGeneration evita que una carga anterior (más lenta) sobreescriba los
// resultados de una carga más reciente cuando el usuario cambia de solicitud.
const mediaBlobUrls = ref<Record<string, string>>({})
const mediaLoadFailed = ref<Record<string, boolean>>({})
let loadGeneration = 0

function filenameFromPath(path: string) {
  return path.split('/').pop() ?? path
}

function mediaUrl(path: string): string | undefined {
  return mediaBlobUrls.value[path]
}

function revokeMediaBlobUrls() {
  for (const url of Object.values(mediaBlobUrls.value) as string[]) URL.revokeObjectURL(url)
  mediaBlobUrls.value = {}
  mediaLoadFailed.value = {}
}

const { get: apiGet } = useApi()

async function loadRequestMedia() {
  const gen = ++loadGeneration
  revokeMediaBlobUrls()
  const paths: string[] = (props.req.items ?? []).flatMap((item: ServiceRequestItem) => [...(item.photos ?? []), ...(item.videos ?? [])])
  await Promise.all(
    paths.map(async (path: string) => {
      try {
        const blob = await apiGet<Blob>(`/services/requests/media/${filenameFromPath(path)}`, { parseAs: 'blob' })
        // Discard results from a superseded load
        if (gen !== loadGeneration) { URL.revokeObjectURL(URL.createObjectURL(blob)); return }
        mediaBlobUrls.value[path] = URL.createObjectURL(blob)
      } catch {
        if (gen === loadGeneration) mediaLoadFailed.value[path] = true
      }
    })
  )
}

const actionError = ref<string | null>(null)
function clearError() { actionError.value = null }

watch(() => props.req.id, () => { loadRequestMedia(); actionError.value = null }, { immediate: true })
watch(() => props.show, (visible) => { if (!visible) actionError.value = null })
onBeforeUnmount(revokeMediaBlobUrls)

// Propuestas de precio: se cargan al abrir el modal (la sección misma consulta bajo demanda)
const priceProposalRef = ref<InstanceType<typeof ServiceRequestPriceProposal> | null>(null)
watch(() => props.show, (visible) => {
  if (visible) priceProposalRef.value?.loadProposals()
}, { immediate: true })

// Lightbox/carrusel: visualización inline de fotos+videos de un ítem, sin abrir pestaña externa
const lightbox = ref(false)
const lightboxMedia = ref<MediaEntry[]>([])
const lightboxIndex = ref(0)

function openLightbox(item: ServiceRequestItem, index: number) {
  lightboxMedia.value = [
    ...(item.photos ?? []).map((path): MediaEntry => ({ type: 'photo', path })),
    ...(item.videos ?? []).map((path): MediaEntry => ({ type: 'video', path })),
  ]
  lightboxIndex.value = index
  lightbox.value = true
}
function closeLightbox() {
  lightbox.value = false
}
function lightboxPrev() {
  lightboxIndex.value = (lightboxIndex.value - 1 + lightboxMedia.value.length) % lightboxMedia.value.length
}
function lightboxNext() {
  lightboxIndex.value = (lightboxIndex.value + 1) % lightboxMedia.value.length
}

const STATUS_LABELS = SERVICE_REQUEST_STATUS_LABELS
const STATUS_CLASSES = SERVICE_REQUEST_STATUS_CLASSES
const STATUS_ICONS = SERVICE_REQUEST_STATUS_ICONS

const MODALITY_LABELS: Record<string, string> = {
  IN_PERSON: '📍 Presencial', REMOTE: '💻 Remoto', ANY: '🤝 Cualquiera',
}

const ESCROW_LABELS: Record<string, string> = {
  HELD: 'Garantía retenida',
  PENDING_FUNDS: 'Pendiente de saldo',
  RELEASED: 'Garantía liberada',
  REFUNDED: 'Garantía reembolsada',
}
const ESCROW_ICONS: Record<string, unknown> = {
  HELD: ShieldCheckIcon,
  PENDING_FUNDS: ExclamationTriangleIcon,
  RELEASED: CheckCircleIcon,
  REFUNDED: ArrowUturnLeftIcon,
}
const ESCROW_CLASSES: Record<string, string> = {
  HELD: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  PENDING_FUNDS: 'bg-amber-50 border-amber-100 text-amber-800',
  RELEASED: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  REFUNDED: 'bg-gray-50 border-gray-200 text-gray-700',
}
const escrowDescription = computed(() => {
  const isProvider = props.isProvider
  switch (props.req.escrowStatus) {
    case 'HELD':
      return isProvider
        ? 'La plataforma retiene el pago del cliente y te lo liberará al confirmar la finalización.'
        : 'Se retuvo el monto de tu billetera como garantía. Se liberará al proveedor cuando confirmes que el servicio se completó.'
    case 'PENDING_FUNDS':
      return isProvider
        ? 'El cliente todavía no tiene saldo suficiente para cubrir la garantía. Se reintentará automáticamente.'
        : 'No tenías saldo suficiente para la garantía. Carga saldo y se retendrá automáticamente.'
    case 'RELEASED':
      return isProvider
        ? 'La garantía ya fue liberada a tu billetera.'
        : 'La garantía fue liberada al proveedor.'
    case 'REFUNDED':
      return isProvider
        ? 'La garantía fue reembolsada al cliente.'
        : 'La garantía fue reembolsada a tu billetera.'
    default:
      return ''
  }
})

const router = useRouter()
function goToWallet() {
  emit('close')
  router.push('/wallet')
}

if (!defaultRate.value) fetchRates(false, true)

const contactInitial = computed(() =>
  (props.isProvider ? props.req.clientName : props.req.providerName)[0]?.toUpperCase() ?? '?'
)

const nextActions = computed(() => {
  if (!props.isProvider) return []
  if (props.req.status === 'PENDING' || props.req.status === 'SEEN') return [
    { status: 'CONTACTED', label: 'Marcar contactado', icon: PhoneArrowUpRightIcon, class: 'bg-blue-600 text-white hover:bg-blue-700' },
    { status: 'REJECTED', label: 'Rechazar', icon: XCircleIcon, class: 'bg-red-50 text-red-600 hover:bg-red-100' },
  ]
  // CONTACTED: el proveedor ya no puede forzar el cierre — solo el cliente puede
  // confirmar la finalización (así se garantiza el cobro de la comisión de plataforma).
  return []
})

function onNotesUpdated(providerNotes: string, backendResponse: Record<string, unknown>) {
  emit('updated', { ...props.req, providerNotes, ...backendResponse })
}

function onProposalApproved(proposal: ServiceRequestPriceChangeProposal) {
  emit('updated', {
    ...props.req,
    price: proposal.proposedPrice,
    escrowAmount: (props.req.escrowAmount ?? 0) + proposal.deltaAmount,
  })
}

// Cambio de estado
const updating = ref(false)

async function doStatusChange(status: string) {
  if (updating.value) return
  updating.value = true
  clearError()
  try {
    const { patch } = useApi()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}`, { status })
    // La respuesta del backend (updated) ya trae el status y manda sobre el valor local.
    emit('updated', { ...props.req, statusUpdatedAt: new Date().toISOString(), ...updated })
  } catch (e: any) {
    actionError.value = getApiErrorMessage(e, 'Error al actualizar el estado')
  } finally {
    updating.value = false
  }
}

// Confirmación del cliente: marca la solicitud como CLOSED y habilita su reseña verificada
const confirming = ref(false)
const showReportModal = ref(false)

async function confirmCompletion() {
  if (confirming.value) return
  confirming.value = true
  clearError()
  try {
    const { patch } = useApi()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}/confirm-completion`, {})
    emit('updated', { ...props.req, ...updated, status: 'CLOSED' })
  } catch (e: any) {
    actionError.value = getApiErrorMessage(e, 'Error al confirmar la finalización')
  } finally {
    confirming.value = false
  }
}

// Cancelación del cliente: solo disponible en PENDING/SEEN, con confirmación inline
const canCancel = computed(() => !props.isProvider && ['PENDING', 'SEEN'].includes(props.req.status))
const confirmingCancel = ref(false)
const cancelling = ref(false)

async function cancelRequest() {
  cancelling.value = true
  clearError()
  try {
    const { patch } = useApi()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}/cancel`, {})
    emit('updated', { ...props.req, ...updated, status: 'CANCELLED' })
    confirmingCancel.value = false
  } catch (e: any) {
    actionError.value = getApiErrorMessage(e, 'Error al cancelar la solicitud')
    confirmingCancel.value = false
  } finally {
    cancelling.value = false
  }
}

function formatDate(d: string) {
  const date = new Date(d)
  const datePart = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0
  if (!hasTime) return datePart
  const timePart = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  return `${datePart} · ${timePart}`
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatPrice(p: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(p)
}
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 10)    return 'hace un momento'
  if (sec < 60)    return `hace ${sec} segundo${sec !== 1 ? 's' : ''}`
  const min = Math.floor(sec / 60)
  if (min < 60)    return `hace ${min} minuto${min !== 1 ? 's' : ''}`
  const hrs = Math.floor(min / 60)
  if (hrs < 24)    return `hace ${hrs} hora${hrs !== 1 ? 's' : ''}`
  const days = Math.floor(hrs / 24)
  if (days < 7)    return `hace ${days} día${days !== 1 ? 's' : ''}`
  const weeks = Math.floor(days / 7)
  if (weeks < 4)   return `hace ${weeks} semana${weeks !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months !== 1 ? 'es' : ''}`
  const years = Math.floor(days / 365)
  return `hace ${years} año${years !== 1 ? 's' : ''}`
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
