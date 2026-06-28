<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />

        <div class="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

          <!-- Header -->
          <div class="flex items-start justify-between px-5 py-4 border-b border-gray-100">
            <div class="flex items-center gap-3 min-w-0">
              <div
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
                <div v-if="req.price">
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

              <!-- Ítems solicitados -->
              <div v-if="req.items?.length">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Ítems solicitados ({{ req.items.length }})</p>
                <div class="space-y-2.5">
                  <div v-for="(item, idx) in req.items" :key="item.id" class="border border-gray-100 bg-white rounded-xl p-3.5 shadow-sm">
                    <p class="text-[11px] font-semibold text-gray-400 mb-2">Ítem {{ idx + 1 }}</p>
                    <div v-if="Object.keys(item.fields ?? {}).length" class="grid grid-cols-2 gap-2.5 mb-2.5">
                      <div v-for="[key, value] in Object.entries(item.fields ?? {})" :key="key">
                        <p class="text-[10px] text-gray-400 uppercase tracking-wide">{{ key }}</p>
                        <p class="text-sm text-gray-900 font-medium">{{ value || '—' }}</p>
                      </div>
                    </div>
                    <p v-if="item.notes" class="text-sm text-gray-600 italic mb-2.5 leading-relaxed">"{{ item.notes }}"</p>
                    <div v-if="item.photos?.length" class="grid grid-cols-6 gap-1.5 mb-1.5">
                      <a
                        v-for="(photo, pi) in item.photos"
                        :key="pi"
                        :href="mediaUrl(photo)"
                        target="_blank"
                        class="group aspect-square rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 block relative"
                      >
                        <img v-if="mediaUrl(photo)" :src="mediaUrl(photo)" loading="lazy" class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        <div v-else-if="mediaLoadFailed[photo]" class="w-full h-full flex items-center justify-center text-gray-300">
                          <XCircleIcon class="h-4 w-4" />
                        </div>
                        <div v-else class="w-full h-full animate-pulse bg-gray-200" />
                      </a>
                    </div>
                    <div v-if="item.videos?.length" class="grid grid-cols-3 gap-1.5">
                      <template v-for="(video, vi) in item.videos" :key="vi">
                        <video
                          v-if="mediaUrl(video)"
                          :src="mediaUrl(video)"
                          controls
                          class="w-full h-20 rounded-lg bg-gray-100 ring-1 ring-gray-200 object-cover"
                        />
                        <div v-else class="w-full h-20 rounded-lg bg-gray-100 ring-1 ring-gray-200 animate-pulse" />
                      </template>
                    </div>
                  </div>
                </div>
              </div>

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

              <!-- Timeline de estado -->
              <div>
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Estado del proceso</p>
                <div class="flex items-start">
                  <template v-for="(step, i) in TIMELINE" :key="step.status">
                    <div class="flex flex-col items-center flex-1 min-w-0">
                      <div
                        class="h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all"
                        :class="timelineClass(step.status)"
                      >
                        <component :is="step.icon" class="h-3.5 w-3.5" />
                      </div>
                      <span
                        class="text-xs mt-1 text-center leading-tight"
                        :class="isReached(step.status) ? 'text-gray-900 font-medium' : 'text-gray-400'"
                      >
                        {{ step.label }}
                      </span>
                      <span
                        v-if="stepTimestamp(step.status)"
                        class="text-[10px] text-center leading-tight mt-0.5 px-1"
                        :class="req.status === step.status ? 'text-red-500 font-medium' : 'text-gray-400'"
                        :title="formatDateTime(stepTimestamp(step.status)!)"
                      >
                        {{ timeAgo(stepTimestamp(step.status)!) }}
                      </span>
                      <span v-else class="text-[10px] text-center leading-tight mt-0.5 px-1 text-gray-300">—</span>
                    </div>
                    <div
                      v-if="i < TIMELINE.length - 1"
                      class="h-0.5 flex-1 mt-3.5 transition-colors"
                      :class="isReached(TIMELINE[i+1].status) ? 'bg-red-400' : 'bg-gray-200'"
                    />
                  </template>
                </div>
              </div>

              <!-- Observaciones del proveedor -->
              <div class="border border-gray-100 rounded-xl overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                  <div class="flex items-center gap-2">
                    <DocumentTextIcon class="h-3.5 w-3.5 text-gray-400" />
                    <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Observaciones{{ isProvider ? '' : ' del proveedor' }}
                    </p>
                  </div>
                  <button
                    v-if="isProvider && !editingNotes"
                    class="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                    @click="startEditNotes"
                  >
                    <PencilIcon class="h-3.5 w-3.5" />
                    {{ req.providerNotes || req.price ? 'Editar' : 'Agregar' }}
                  </button>
                </div>

                <div class="p-4">
                  <template v-if="!editingNotes">
                    <p v-if="req.providerNotes" class="text-sm text-gray-700 whitespace-pre-wrap">{{ req.providerNotes }}</p>
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
                        @click="applyQuickReply(tpl)"
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
                          v-if="req.suggestedPrice != null && !priceInput"
                          type="button"
                          class="mt-1 flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 font-medium"
                          @click="useSuggestedPrice"
                        >
                          <SparklesIcon class="h-3 w-3" />
                          Sugerido: ${{ formatPrice(req.suggestedPrice) }} (prom. {{ req.suggestedPriceBasedOn }} trato{{ req.suggestedPriceBasedOn === 1 ? '' : 's' }})
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
                      <button class="btn-secondary text-xs py-1.5 px-3" @click="cancelEditNotes">Cancelar</button>
                      <button class="btn-primary text-xs py-1.5 px-3" :disabled="savingNotes" @click="saveNotes">
                        {{ savingNotes ? 'Guardando...' : 'Guardar' }}
                      </button>
                    </div>
                  </template>
                </div>
              </div>

            </div>
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
          <div v-else-if="isProvider && req.status === 'CERRADO'" class="p-4 border-t border-gray-100 bg-green-50">
            <div class="flex items-center gap-2">
              <CheckCircleIcon class="h-4 w-4 text-green-600 flex-shrink-0" />
              <p class="text-xs text-green-700 font-medium">Servicio completado. Puedes dejar observaciones finales si lo deseas.</p>
            </div>
          </div>

          <!-- Footer — cliente: confirmar finalización -->
          <div v-else-if="!isProvider && req.status === 'CONTACTADO'" class="p-4 border-t border-gray-100 bg-blue-50">
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

          <!-- Footer — cliente (solo lectura / cancelar, PENDIENTE/VISTO/CANCELADO) -->
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
                  <template v-if="req.status === 'PENDIENTE'">Tu solicitud está en espera de respuesta del proveedor.</template>
                  <template v-else-if="req.status === 'VISTO'">El proveedor ya vio tu solicitud y pronto se pondrá en contacto.</template>
                  <template v-else-if="req.status === 'CANCELADO'">Cancelaste esta solicitud.</template>
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
          <div v-if="!isProvider && req.status !== 'CANCELADO'" class="px-4 pb-3 text-center">
            <button class="text-xs text-gray-400 hover:text-red-500 font-medium" @click="showReportModal = true">
              ¿Tuviste un problema con esta solicitud? Reportarlo
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>

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
  DocumentTextIcon,
  PencilIcon,
  ClockIcon,
  EyeIcon,
  PhoneArrowUpRightIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/useApi'
import { useExchangeRates } from '~/composables/useExchangeRates'
import ReportProblemModal from '~/components/modals/ReportProblemModal.vue'

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
  status: 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO' | 'CANCELADO'
  createdAt: string
  statusUpdatedAt?: string
  items?: ServiceRequestItem[]
  suggestedPrice?: number | null
  suggestedPriceBasedOn?: number
  platformFeeRate?: number | null
  platformFeeAmount?: number | null
  platformFeePayer?: 'CLIENT' | 'PROVIDER' | null
}

const props = defineProps<{ show: boolean; req: ServiceRequest; isProvider: boolean }>()
const emit = defineEmits<{ close: []; updated: [ServiceRequest] }>()

const { defaultRate, formatConversion, fetchRates } = useExchangeRates()

// Media de la solicitud (fotos/videos) es privada: se sirve solo tras auth vía
// /services/requests/media/:filename. Se descarga como blob y se expone como
// object URL local; las URLs se revocan al cambiar de solicitud o desmontar.
const mediaBlobUrls = ref<Record<string, string>>({})
const mediaLoadFailed = ref<Record<string, boolean>>({})

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

async function loadRequestMedia() {
  revokeMediaBlobUrls()
  const { get } = useApi()
  const paths: string[] = (props.req.items ?? []).flatMap((item: ServiceRequestItem) => [...(item.photos ?? []), ...(item.videos ?? [])])
  await Promise.all(
    paths.map(async (path: string) => {
      try {
        const blob = await get<Blob>(`/services/requests/media/${filenameFromPath(path)}`, { parseAs: 'blob' })
        mediaBlobUrls.value[path] = URL.createObjectURL(blob)
      } catch {
        mediaLoadFailed.value[path] = true
      }
    })
  )
}

watch(() => props.req.id, loadRequestMedia, { immediate: true })
onBeforeUnmount(revokeMediaBlobUrls)

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente', VISTO: 'Visto', CONTACTADO: 'Contactado', CERRADO: 'Cerrado', CANCELADO: 'Cancelado',
}
const STATUS_CLASSES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  VISTO: 'bg-gray-100 text-gray-600',
  CONTACTADO: 'bg-blue-100 text-blue-700',
  CERRADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
}
const STATUS_ICONS: Record<string, any> = {
  PENDIENTE: ClockIcon, VISTO: EyeIcon, CONTACTADO: PhoneArrowUpRightIcon, CERRADO: CheckCircleIcon, CANCELADO: XCircleIcon,
}

const QUICK_REPLY_TEMPLATES = [
  'Te contacto en breve',
  'No disponible esta fecha, ¿flexibilidad?',
  'Confirmado, llevo todo lo necesario',
  'Necesito más información del trabajo',
]
const MODALITY_LABELS: Record<string, string> = {
  PRESENCIAL: '📍 Presencial', REMOTO: '💻 Remoto', CUALQUIERA: '🤝 Cualquiera',
}

if (!defaultRate.value) fetchRates(false, true)

const TIMELINE = [
  { status: 'PENDIENTE',  label: 'Pendiente',  icon: ClockIcon },
  { status: 'VISTO',      label: 'Visto',       icon: EyeIcon },
  { status: 'CONTACTADO', label: 'Contactado',  icon: PhoneArrowUpRightIcon },
  { status: 'CERRADO',    label: 'Cerrado',     icon: CheckCircleIcon },
]
const STATUS_ORDER = ['PENDIENTE', 'VISTO', 'CONTACTADO', 'CERRADO']

const contactInitial = computed(() =>
  (props.isProvider ? props.req.clientName : props.req.providerName)[0]?.toUpperCase() ?? '?'
)

function isReached(status: string) {
  return STATUS_ORDER.indexOf(status) <= STATUS_ORDER.indexOf(props.req.status)
}

function timelineClass(status: string) {
  if (props.req.status === status) return 'border-red-500 bg-red-500 text-white'
  if (isReached(status)) return 'border-red-300 bg-red-100 text-red-600'
  return 'border-gray-200 bg-white text-gray-300'
}

// Timestamp a mostrar bajo cada paso del timeline.
// PENDIENTE siempre usa la fecha de creación; el paso actual usa statusUpdatedAt
// (no se conserva un historial por paso intermedio).
function stepTimestamp(status: string): string | null {
  if (status === 'PENDIENTE') return props.req.createdAt
  if (props.req.status === status) return props.req.statusUpdatedAt ?? null
  return null
}

const nextActions = computed(() => {
  if (!props.isProvider) return []
  if (props.req.status === 'PENDIENTE' || props.req.status === 'VISTO') return [
    { status: 'CONTACTADO', label: 'Marcar contactado', icon: PhoneArrowUpRightIcon, class: 'bg-blue-600 text-white hover:bg-blue-700' },
    { status: 'CERRADO', label: 'Cerrar', icon: CheckCircleIcon, class: 'bg-gray-200 text-gray-700 hover:bg-gray-300' },
  ]
  if (props.req.status === 'CONTACTADO') return [
    { status: 'CERRADO', label: 'Cerrar trato', icon: CheckCircleIcon, class: 'bg-green-600 text-white hover:bg-green-700' },
  ]
  return []
})

// Observaciones + precio acordado
const editingNotes = ref(false)
const notesInput = ref('')
const priceInput = ref<number | null>(null)
const priceUnitInput = ref('')
const savingNotes = ref(false)

function startEditNotes() {
  notesInput.value = props.req.providerNotes ?? ''
  priceInput.value = props.req.price ?? null
  priceUnitInput.value = props.req.priceUnit ?? ''
  editingNotes.value = true
}
function cancelEditNotes() {
  editingNotes.value = false
}

async function saveNotes() {
  savingNotes.value = true
  try {
    const { patch } = useApi()
    const body: Record<string, unknown> = { providerNotes: notesInput.value }
    if (priceInput.value !== null && !Number.isNaN(priceInput.value)) body.price = priceInput.value
    if (priceUnitInput.value.trim()) body.priceUnit = priceUnitInput.value.trim()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}`, body)
    emit('updated', { ...props.req, providerNotes: notesInput.value, ...updated })
    editingNotes.value = false
  } catch { /* silently ignore */ } finally {
    savingNotes.value = false
  }
}

// Cambio de estado
const updating = ref(false)

async function doStatusChange(status: string) {
  updating.value = true
  try {
    const { patch } = useApi()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}`, { status })
    emit('updated', { ...props.req, status: status as ServiceRequest['status'], statusUpdatedAt: new Date().toISOString(), ...updated })
  } catch { /* silently ignore */ } finally {
    updating.value = false
  }
}

// Confirmación del cliente: marca la solicitud como CERRADO y habilita su reseña verificada
const confirming = ref(false)
const showReportModal = ref(false)

async function confirmCompletion() {
  confirming.value = true
  try {
    const { patch } = useApi()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}/confirm-completion`, {})
    emit('updated', { ...props.req, ...updated, status: 'CERRADO' })
  } catch { /* silently ignore */ } finally {
    confirming.value = false
  }
}

// Cancelación del cliente: solo disponible en PENDIENTE/VISTO, con confirmación inline
const canCancel = computed(() => !props.isProvider && ['PENDIENTE', 'VISTO'].includes(props.req.status))
const confirmingCancel = ref(false)
const cancelling = ref(false)

async function cancelRequest() {
  cancelling.value = true
  try {
    const { patch } = useApi()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}/cancel`, {})
    emit('updated', { ...props.req, ...updated, status: 'CANCELADO' })
    confirmingCancel.value = false
  } catch { /* silently ignore */ } finally {
    cancelling.value = false
  }
}

// Plantillas de respuesta rápida (proveedor): rellenan el textarea de observaciones
function applyQuickReply(template: string) {
  notesInput.value = template
}

// Precio sugerido: solo lo usa el proveedor cuando aún no fijó un precio
function useSuggestedPrice() {
  if (props.req.suggestedPrice != null) priceInput.value = props.req.suggestedPrice
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
