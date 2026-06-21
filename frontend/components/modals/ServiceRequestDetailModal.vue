<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />

        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

          <!-- Header -->
          <div class="flex items-start justify-between p-6 border-b border-gray-100">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                :class="isProvider ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ contactInitial }}
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-gray-900 truncate">{{ req.serviceName }}</h2>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ isProvider ? req.clientName : req.providerName }}
                  <span class="text-gray-300 mx-1">·</span>
                  <span :title="formatDateTime(req.createdAt)">{{ timeAgo(req.createdAt) }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0 ml-3">
              <span class="badge inline-flex items-center gap-1" :class="STATUS_CLASSES[req.status]">
                <component :is="STATUS_ICONS[req.status]" class="h-3 w-3" />
                {{ STATUS_LABELS[req.status] }}
              </span>
              <button class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" @click="$emit('close')">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Body scrollable -->
          <div class="flex-1 overflow-y-auto">
            <div class="p-6 space-y-5">

              <!-- Grid info principal -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Modalidad</p>
                  <p class="text-sm text-gray-900 font-medium">{{ MODALITY_LABELS[req.modality] ?? req.modality }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Fecha preferida</p>
                  <p class="text-sm text-gray-900 font-medium">{{ formatDate(req.preferredDate) }}</p>
                </div>
                <div v-if="req.price">
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Precio acordado</p>
                  <p class="text-sm text-gray-900 font-medium">${{ formatPrice(req.price) }}{{ req.priceUnit ? ' / ' + req.priceUnit : '' }}</p>
                  <p v-if="defaultRate" class="text-xs text-gray-400 font-medium">
                    {{ formatConversion(req.price, defaultRate) }}{{ req.priceUnit ? ` / ${req.priceUnit}` : '' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Solicitud creada</p>
                  <p class="text-sm text-gray-900 font-medium" :title="formatDateTime(req.createdAt)">{{ timeAgo(req.createdAt) }}</p>
                  <p class="text-xs text-gray-400">{{ formatDateTime(req.createdAt) }}</p>
                </div>
              </div>

              <!-- Ubicación (presencial) -->
              <div v-if="req.address" class="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                <MapPinIcon class="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Ubicación</p>
                  <p class="text-sm text-gray-900">{{ req.address }}{{ req.city ? `, ${req.city}` : '' }}</p>
                </div>
              </div>

              <!-- Descripción del cliente -->
              <div v-if="req.description" class="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
                <ChatBubbleLeftIcon class="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">Descripción del cliente</p>
                  <p class="text-sm text-gray-800 italic">"{{ req.description }}"</p>
                </div>
              </div>

              <!-- Datos de contacto (solo proveedor) -->
              <div v-if="isProvider" class="border border-gray-200 rounded-xl p-4">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos de contacto</p>
                <div class="space-y-2">
                  <div class="flex items-center gap-3">
                    <UserIcon class="h-4 w-4 text-gray-400" />
                    <span class="text-sm text-gray-900 font-medium">{{ req.clientName }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <PhoneIcon class="h-4 w-4 text-gray-400" />
                    <a :href="`tel:${req.clientPhone}`" class="text-sm text-blue-600 hover:underline font-medium">{{ req.clientPhone }}</a>
                  </div>
                  <div v-if="req.clientEmail" class="flex items-center gap-3">
                    <EnvelopeIcon class="h-4 w-4 text-gray-400" />
                    <a :href="`mailto:${req.clientEmail}`" class="text-sm text-blue-600 hover:underline">{{ req.clientEmail }}</a>
                  </div>
                </div>
              </div>

              <!-- Timeline de estado -->
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estado del proceso</p>
                <div class="flex items-start">
                  <template v-for="(step, i) in TIMELINE" :key="step.status">
                    <div class="flex flex-col items-center flex-1 min-w-0">
                      <div
                        class="h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all"
                        :class="timelineClass(step.status)"
                      >
                        <component :is="step.icon" class="h-4 w-4" />
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
                      class="h-0.5 flex-1 mt-4 transition-colors"
                      :class="isReached(TIMELINE[i+1].status) ? 'bg-red-400' : 'bg-gray-200'"
                    />
                  </template>
                </div>
              </div>

              <!-- Observaciones del proveedor -->
              <div class="border border-gray-200 rounded-xl overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div class="flex items-center gap-2">
                    <DocumentTextIcon class="h-4 w-4 text-gray-400" />
                    <p class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Observaciones{{ isProvider ? '' : ' del proveedor' }}
                    </p>
                  </div>
                  <button
                    v-if="isProvider && !editingNotes"
                    class="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                    @click="startEditNotes"
                  >
                    <PencilIcon class="h-3.5 w-3.5" />
                    {{ req.providerNotes ? 'Editar' : 'Agregar' }}
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
                    <textarea
                      v-model="notesInput"
                      rows="4"
                      placeholder="Ej: Acordamos el lunes 15 a las 10am. Llevar herramientas propias. Precio final $80..."
                      class="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                    <div class="flex justify-end gap-2 mt-2">
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

          <!-- Footer — cliente (solo lectura, resto de estados) -->
          <div v-else-if="!isProvider" class="p-4 border-t border-gray-100 bg-blue-50">
            <div class="flex items-center gap-2">
              <InformationCircleIcon class="h-4 w-4 text-blue-500 flex-shrink-0" />
              <p class="text-xs text-blue-700">
                <template v-if="req.status === 'PENDIENTE'">Tu solicitud está en espera de respuesta del proveedor.</template>
                <template v-else-if="req.status === 'VISTO'">El proveedor ya vio tu solicitud y pronto se pondrá en contacto.</template>
                <template v-else>Este servicio fue cerrado/completado. Ya puedes dejar una reseña verificada en el perfil del proveedor.</template>
              </p>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
} from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/useApi'
import { useExchangeRates } from '~/composables/useExchangeRates'

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
  status: 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO'
  createdAt: string
  statusUpdatedAt?: string
}

const props = defineProps<{ show: boolean; req: ServiceRequest; isProvider: boolean }>()
const emit = defineEmits<{ close: []; updated: [ServiceRequest] }>()

const { defaultRate, formatConversion, fetchRates } = useExchangeRates()

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente', VISTO: 'Visto', CONTACTADO: 'Contactado', CERRADO: 'Cerrado',
}
const STATUS_CLASSES: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  VISTO: 'bg-gray-100 text-gray-600',
  CONTACTADO: 'bg-blue-100 text-blue-700',
  CERRADO: 'bg-green-100 text-green-700',
}
const STATUS_ICONS: Record<string, any> = {
  PENDIENTE: ClockIcon, VISTO: EyeIcon, CONTACTADO: PhoneArrowUpRightIcon, CERRADO: CheckCircleIcon,
}
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

// Observaciones
const editingNotes = ref(false)
const notesInput = ref('')
const savingNotes = ref(false)

function startEditNotes() {
  notesInput.value = props.req.providerNotes ?? ''
  editingNotes.value = true
}
function cancelEditNotes() {
  editingNotes.value = false
}

async function saveNotes() {
  savingNotes.value = true
  try {
    const { patch } = useApi()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}`, { providerNotes: notesInput.value })
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

async function confirmCompletion() {
  confirming.value = true
  try {
    const { patch } = useApi()
    const updated = await patch<ServiceRequest>(`/services/requests/${props.req.id}/confirm-completion`, {})
    emit('updated', { ...props.req, status: 'CERRADO', ...updated })
  } catch { /* silently ignore */ } finally {
    confirming.value = false
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
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
