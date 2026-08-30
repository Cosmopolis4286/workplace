<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="$emit('update:modelValue', false)">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('update:modelValue', false)" />

        <Transition
          enter-active-class="duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
        >
          <div v-if="modelValue" class="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">

            <!-- Handle mobile -->
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <ServiceRequestModalHeader
              :service="service"
              :image-src="imageSrc"
              @close="$emit('update:modelValue', false)"
            />

            <!-- Formulario -->
            <form class="px-5 py-4 space-y-4" @submit.prevent="submit">

              <!-- Modalidad -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">Modalidad</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in modalityOptions" :key="opt.value"
                    type="button"
                    class="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all duration-200"
                    :class="form.modality === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.modality = opt.value"
                  >
                    <span class="text-xl">{{ opt.emoji }}</span>
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Fecha y hora preferida -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-gray-700 mb-1.5">Fecha preferida <span class="text-blue-500">*</span></label>
                  <input
                    v-model="form.preferredDate"
                    type="date"
                    required
                    :min="minDate"
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    :class="fieldErrors.preferredDate ? 'border-red-300' : 'border-gray-200'"
                    @blur="touch('preferredDate')"
                  />
                  <p v-if="fieldErrors.preferredDate" class="text-[11px] text-red-500 mt-1">{{ fieldErrors.preferredDate }}</p>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-700 mb-1.5">Hora preferida <span class="text-blue-500">*</span></label>
                  <input
                    v-model="form.preferredTime"
                    type="time"
                    required
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    :class="fieldErrors.preferredTime ? 'border-red-300' : 'border-gray-200'"
                    @blur="touch('preferredTime')"
                  />
                  <p v-if="fieldErrors.preferredTime" class="text-[11px] text-red-500 mt-1">{{ fieldErrors.preferredTime }}</p>
                </div>
              </div>

              <!-- Dirección (solo presencial) -->
              <Transition
                enter-active-class="duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="form.modality === 'IN_PERSON'" class="space-y-3">
                  <!-- Aviso de alcance del prestador -->
                  <div v-if="providerLocationLabel" class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <svg class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <p class="text-[11px] text-amber-700 leading-snug">
                      Este proveedor atiende en <strong>{{ providerLocationLabel }}</strong>. Si tu dirección queda fuera de esa zona, puede que no acepte la solicitud.
                    </p>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">Dirección <span class="text-blue-500">*</span></label>
                    <input
                      v-model="form.address"
                      type="text"
                      placeholder="Calle, número, barrio..."
                      required
                      minlength="5"
                      maxlength="200"
                      class="w-full px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      :class="fieldErrors.address ? 'border-red-300' : 'border-gray-200'"
                      @blur="touch('address')"
                    />
                    <p v-if="fieldErrors.address" class="text-[11px] text-red-500 mt-1">{{ fieldErrors.address }}</p>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">Ciudad</label>
                    <input
                      v-model="form.city"
                      type="text"
                      :placeholder="providerCity ? `Ej: ${providerCity}` : 'Ciudad'"
                      maxlength="100"
                      class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <p v-if="cityMismatch" class="text-[11px] text-amber-600 mt-1">
                      ⚠ El proveedor opera en {{ providerLocationLabel }}, no en "{{ form.city }}".
                    </p>
                  </div>
                </div>
              </Transition>

              <!-- Datos de contacto -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">Tus datos de contacto</label>
                <div class="space-y-2.5">
                  <div>
                    <input
                      v-model="form.clientName"
                      type="text"
                      placeholder="Nombre completo *"
                      required
                      minlength="3"
                      maxlength="100"
                      class="w-full px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      :class="fieldErrors.clientName ? 'border-red-300' : 'border-gray-200'"
                      @blur="touch('clientName')"
                    />
                    <p v-if="fieldErrors.clientName" class="text-[11px] text-red-500 mt-1">{{ fieldErrors.clientName }}</p>
                  </div>
                  <div>
                    <input
                      v-model="form.clientPhone"
                      type="tel"
                      placeholder="Teléfono / WhatsApp *"
                      required
                      maxlength="30"
                      class="w-full px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      :class="fieldErrors.clientPhone ? 'border-red-300' : 'border-gray-200'"
                      @blur="touch('clientPhone')"
                    />
                    <p v-if="fieldErrors.clientPhone" class="text-[11px] text-red-500 mt-1">{{ fieldErrors.clientPhone }}</p>
                  </div>
                  <div>
                    <input
                      v-model="form.clientEmail"
                      type="email"
                      placeholder="Correo electrónico (opcional)"
                      class="w-full px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      :class="fieldErrors.clientEmail ? 'border-red-300' : 'border-gray-200'"
                      @blur="touch('clientEmail')"
                    />
                    <p v-if="fieldErrors.clientEmail" class="text-[11px] text-red-500 mt-1">{{ fieldErrors.clientEmail }}</p>
                  </div>
                </div>
              </div>

              <!-- Descripción -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1.5">Describe lo que necesitas</label>
                <textarea
                  v-model="form.description"
                  placeholder="Explica brevemente qué necesitas, detalles importantes, expectativas..."
                  maxlength="600"
                  rows="3"
                  class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  @blur="touch('description')"
                />
                <p class="text-[11px] text-gray-400 mt-1 text-right">{{ form.description.length }}/600</p>
              </div>

              <!-- Ítems a reparar/solicitar -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-xs font-bold text-gray-700">Ítems a reparar/solicitar</label>
                  <span class="text-[11px] text-gray-400">{{ items.length }} ítem{{ items.length === 1 ? '' : 's' }}</span>
                </div>

                <div class="space-y-3">
                  <ServiceRequestItemEditor
                    v-for="(item, idx) in items" :key="idx"
                    :item="item"
                    :index="idx"
                    :field-names="itemFieldNames"
                    :error="itemErrors[idx]"
                    @remove="removeItem(idx)"
                    @update:field="(fieldName, value) => item.fields[fieldName] = value"
                    @update:notes="item.notes = $event"
                    @photos-selected="onPhotosSelected(idx, $event)"
                    @videos-selected="onVideosSelected(idx, $event)"
                    @remove-photo="removePhoto(idx, $event)"
                    @remove-video="removeVideo(idx, $event)"
                  />
                </div>

                <button
                  type="button"
                  class="mt-2 w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  @click="addItem"
                >
                  + Agregar otro ítem
                </button>
              </div>

              <ServiceRequestPriceInfo
                :service="service"
                :converted-price="convertedPrice"
                :default-rate="defaultRate"
                :modality-label="(modalityOptions.find(o => o.value === form.modality)?.label ?? 'este servicio').toLowerCase()"
                :items-count="items.length"
              />

              <!-- KYC banner -->
              <p v-if="kycStatus && kycStatus !== 'APPROVED'" class="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-2 rounded-xl">
                Debes verificar tu identidad antes de solicitar un servicio.
                <NuxtLink to="/verification" class="font-semibold underline" @click="$emit('update:modelValue', false)">Completa la verificación</NuxtLink>.
              </p>

              <!-- Error -->
              <p v-if="errorMsg" class="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-xl">{{ errorMsg }}</p>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="sending || (kycStatus !== undefined && kycStatus !== 'APPROVED')"
                class="w-full py-3.5 bg-blue-600 text-white font-black text-sm rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span v-if="sending" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{{ sending ? 'Enviando solicitud...' : 'Solicitar Servicio' }}</span>
              </button>

              <p class="text-center text-[11px] text-gray-400">
                El proveedor recibirá tu solicitud y se pondrá en contacto contigo para coordinar los detalles.
              </p>
            </form>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApi } from '~/composables/core/useApi'
import { useAuth } from '~/composables/auth/useAuth'
import { useKyc } from '~/composables/kyc/useKyc'
import { useExchangeRates } from '~/composables/wallets/useExchangeRates'
import { useCheckoutResume } from '~/composables/catalog/useCheckoutResume'
import ServiceRequestModalHeader from '~/components/modals/catalog-service-request/ServiceRequestModalHeader.vue'
import ServiceRequestItemEditor from '~/components/modals/catalog-service-request/ServiceRequestItemEditor.vue'
import ServiceRequestPriceInfo from '~/components/modals/catalog-service-request/ServiceRequestPriceInfo.vue'
import {
  useServiceRequestItems,
  emptyServiceRequestItem,
  validatePhotoFile,
  validateVideoFile,
  MAX_PHOTOS_PER_ITEM,
  MAX_VIDEOS_PER_ITEM,
  type ServiceRequestItemForm,
} from '~/composables/services/useServiceRequestItems'

const props = defineProps<{
  modelValue: boolean
  service: CatalogService | null
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'success': []
}>()

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string
const route = useRoute()
const { user } = useAuth()
const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)
const { defaultRate } = useExchangeRates()
const { saveCheckoutDraft } = useCheckoutResume()

const convertedPrice = computed(() => {
  const price = props.service?.price
  if (!price || !defaultRate.value) return null
  return price * defaultRate.value.rateToUsd
})

const ALL_MODALITY_OPTIONS: Record<string, { label: string; emoji: string }> = {
  IN_PERSON: { label: 'Presencial', emoji: '📍' },
  REMOTE: { label: 'Remoto', emoji: '💻' },
  ANY: { label: 'Cualquiera', emoji: '🤝' },
}

const modalityOptions = computed(() => {
  const vals = props.service?.modalities?.length
    ? props.service.modalities
    : ['IN_PERSON', 'REMOTE', 'ANY']
  return vals.map(v => ({
    value: v,
    label: ALL_MODALITY_OPTIONS[v]?.label ?? v,
    emoji: ALL_MODALITY_OPTIONS[v]?.emoji ?? '📋',
  }))
})

const minDate = new Date().toISOString().split('T')[0]

const providerCity = computed(() => props.service?.user?.city ?? '')
const providerState = computed(() => props.service?.user?.state ?? '')
const providerLocationLabel = computed(() => {
  if (providerCity.value && providerState.value) return `${providerCity.value}, ${providerState.value}`
  return providerCity.value || providerState.value || ''
})
const cityMismatch = computed(() => {
  if (!form.value.city.trim() || !providerCity.value) return false
  return form.value.city.trim().toLowerCase() !== providerCity.value.trim().toLowerCase()
})

const defaultForm = () => ({
  modality: (modalityOptions.value[0]?.value ?? 'ANY') as string,
  preferredDate: '',
  preferredTime: '',
  address: '',
  city: providerCity.value || '',
  clientName: user.value ? `${user.value.firstName} ${user.value.lastName}`.trim() : '',
  clientPhone: (user.value as any)?.phone ?? '',
  clientEmail: user.value?.email ?? '',
  description: '',
})

const form = ref(defaultForm())
const sending = ref(false)
const errorMsg = ref('')

const { uploadMedia } = useServiceRequestItems()
const itemFieldNames = computed(() => props.service?.itemFields ?? [])
const items = ref<ServiceRequestItemForm[]>([])
const itemErrors = ref<Record<number, string>>({})

function addItem() {
  items.value.push(emptyServiceRequestItem(itemFieldNames.value))
}

function removeItem(idx: number) {
  items.value.splice(idx, 1)
  delete itemErrors.value[idx]
}

async function onPhotosSelected(idx: number, e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const item = items.value[idx]
  if (!item) return
  itemErrors.value[idx] = ''
  for (const file of files) {
    if (item.photoFiles.length >= MAX_PHOTOS_PER_ITEM) {
      itemErrors.value[idx] = `Máximo ${MAX_PHOTOS_PER_ITEM} fotos por ítem`
      break
    }
    const err = validatePhotoFile(file)
    if (err) { itemErrors.value[idx] = err; continue }
    item.photoFiles.push(file)
  }
}

async function onVideosSelected(idx: number, e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const item = items.value[idx]
  if (!item) return
  itemErrors.value[idx] = ''
  for (const file of files) {
    if (item.videoFiles.length >= MAX_VIDEOS_PER_ITEM) {
      itemErrors.value[idx] = `Máximo ${MAX_VIDEOS_PER_ITEM} videos por ítem`
      break
    }
    const err = await validateVideoFile(file)
    if (err) { itemErrors.value[idx] = err; continue }
    item.videoFiles.push(file)
  }
}

function removePhoto(idx: number, fileIdx: number) {
  items.value[idx]?.photoFiles.splice(fileIdx, 1)
}

function removeVideo(idx: number, fileIdx: number) {
  items.value[idx]?.videoFiles.splice(fileIdx, 1)
}

const touched = ref<Record<string, boolean>>({})
function touch(field: string) {
  touched.value[field] = true
}

const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/
const EMAIL_REGEX = /^\S+@\S+\.\S+$/

const fieldErrors = computed(() => {
  const e: Record<string, string> = {}

  if (touched.value.preferredDate && form.value.preferredDate) {
    const selected = new Date(form.value.preferredDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selected < today) e.preferredDate = 'La fecha no puede ser en el pasado'
  }
  if (touched.value.preferredTime && !form.value.preferredTime) {
    e.preferredTime = 'Selecciona una hora'
  }
  if (touched.value.address && form.value.modality === 'IN_PERSON' && form.value.address.trim().length < 5) {
    e.address = 'Ingresa una dirección más detallada'
  }
  if (touched.value.clientName && form.value.clientName.trim().length < 3) {
    e.clientName = 'Ingresa tu nombre completo'
  }
  if (touched.value.clientPhone && !PHONE_REGEX.test(form.value.clientPhone.trim())) {
    e.clientPhone = 'Ingresa un teléfono válido'
  }
  if (touched.value.clientEmail && form.value.clientEmail && !EMAIL_REGEX.test(form.value.clientEmail.trim())) {
    e.clientEmail = 'Ingresa un correo válido'
  }
  return e
})

watch(() => props.service, () => {
  form.value = defaultForm()
  errorMsg.value = ''
  items.value = []
  itemErrors.value = {}
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    form.value.modality = modalityOptions.value[0]?.value ?? 'ANY'
    fetchMyKycStatus()
  }
})

watch(() => user.value, (u) => {
  if (u) {
    form.value.clientName = `${u.firstName} ${u.lastName}`.trim()
    form.value.clientEmail = u.email ?? ''
    form.value.clientPhone = (u as any).phone ?? ''
  }
}, { immediate: true })

function imageSrc(image: string) {
  if (image.startsWith('http')) return image
  return `${apiUrl}${image}`
}

function validateAll(): boolean {
  touched.value = {
    preferredDate: true,
    preferredTime: true,
    address: true,
    clientName: true,
    clientPhone: true,
    clientEmail: true,
  }

  if (!form.value.preferredDate) {
    errorMsg.value = 'Selecciona una fecha preferida.'
    return false
  }
  if (form.value.modality === 'IN_PERSON' && !form.value.address.trim()) {
    errorMsg.value = 'La dirección es requerida para modalidad presencial.'
    return false
  }
  if (Object.keys(fieldErrors.value).length > 0) {
    errorMsg.value = 'Revisa los campos marcados antes de continuar.'
    return false
  }
  return true
}

// Guarda la selección actual (sin archivos — no son serializables a
// sessionStorage) y redirige a login; se retoma automáticamente al volver.
function redirectToLoginAndResume() {
  if (!props.service) return
  saveCheckoutDraft({
    kind: 'service-request',
    serviceId: props.service.id,
    form: form.value,
  })
  const currentPath = route.fullPath
  const target = currentPath.includes('?') ? `${currentPath}&intent=checkout` : `${currentPath}?intent=checkout`
  navigateTo(`/login?redirect=${encodeURIComponent(target)}`)
}

async function submit() {
  if (!props.service) return
  errorMsg.value = ''

  if (!validateAll()) return

  const hasFiles = items.value.some(i => i.photoFiles.length || i.videoFiles.length)

  if (!user.value) {
    // Con archivos adjuntos no hay forma de preservarlos a través del
    // redirect (no son serializables) — se le pide iniciar sesión antes de
    // adjuntar en vez de perder silenciosamente lo que subió.
    if (hasFiles) {
      errorMsg.value = 'Debes iniciar sesión para adjuntar archivos a tu solicitud.'
      return
    }
    redirectToLoginAndResume()
    return
  }

  sending.value = true
  try {
    const itemsPayload = []
    for (const item of items.value) {
      const photos = item.photoFiles.length ? await uploadMedia(item.photoFiles) : []
      const videos = item.videoFiles.length ? await uploadMedia(item.videoFiles) : []
      itemsPayload.push({
        fields: item.fields,
        notes: item.notes || undefined,
        photos,
        videos,
      })
    }

    const { post } = useApi()
    await post('/services/requests', {
      serviceId: props.service.id,
      serviceName: props.service.name,
      providerId: props.service.user.id,
      providerName: `${props.service.user.firstName} ${props.service.user.lastName}`,
      modality: form.value.modality,
      preferredDate: form.value.preferredDate,
      preferredTime: form.value.preferredTime || undefined,
      address: form.value.address || undefined,
      city: form.value.city || undefined,
      clientName: form.value.clientName,
      clientPhone: form.value.clientPhone,
      clientEmail: form.value.clientEmail || undefined,
      description: form.value.description || undefined,
      price: props.service.price,
      priceUnit: props.service.priceUnit || undefined,
      items: itemsPayload,
    })
    emit('update:modelValue', false)
    emit('success')
    form.value = defaultForm()
    touched.value = {}
    items.value = []
    itemErrors.value = {}
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'No se pudo enviar la solicitud. Intenta de nuevo.'
  } finally {
    sending.value = false
  }
}

// Llamado por la página anfitriona cuando detecta un draft de solicitud
// pendiente tras volver de /login — rellena el formulario pero deja que el
// usuario confirme el envío con un click.
function applyDraftForm(draftForm: Record<string, unknown>) {
  form.value = { ...form.value, ...draftForm } as typeof form.value
}

defineExpose({ applyDraftForm })
</script>
