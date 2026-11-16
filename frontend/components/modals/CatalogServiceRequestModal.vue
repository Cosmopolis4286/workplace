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

              <!-- Contacto privado del cliente -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">Teléfono de contacto (privado)</label>
                <input
                  v-model="form.clientPhone"
                  type="tel"
                  placeholder="Teléfono / WhatsApp"
                  maxlength="30"
                  class="w-full px-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  :class="fieldErrors.clientPhone ? 'border-red-300' : 'border-gray-200'"
                  @blur="touch('clientPhone')"
                />
                <p v-if="fieldErrors.clientPhone" class="text-[11px] text-red-500 mt-1">{{ fieldErrors.clientPhone }}</p>
                <p class="text-[11px] text-gray-400 mt-1">Este número aún no está verificado y no se comparte con el prestador durante la consulta inicial.</p>
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

              <p class="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-xl">
                Esta es una consulta inicial, no una contratación. El precio mostrado en el catálogo es referencial; las condiciones se acuerdan antes de formalizar el servicio.
              </p>

              <!-- Error -->
              <p v-if="errorMsg" class="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-xl">{{ errorMsg }}</p>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="sending"
                class="w-full py-3.5 bg-blue-600 text-white font-black text-sm rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span v-if="sending" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{{ sending ? 'Enviando consulta...' : 'Enviar consulta' }}</span>
              </button>

              <p class="text-center text-[11px] text-gray-400">
                El prestador recibirá tu consulta dentro de WorkPlace. No se crea una contratación ni se realiza ningún pago.
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
import { useCheckoutResume } from '~/composables/catalog/useCheckoutResume'
import ServiceRequestModalHeader from '~/components/modals/catalog-service-request/ServiceRequestModalHeader.vue'

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
const { saveCheckoutDraft } = useCheckoutResume()

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
  clientPhone: (user.value as any)?.phone ?? '',
  description: '',
})

const form = ref(defaultForm())
const sending = ref(false)
const errorMsg = ref('')

const touched = ref<Record<string, boolean>>({})
function touch(field: string) {
  touched.value[field] = true
}

const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/

const fieldErrors = computed(() => {
  const e: Record<string, string> = {}

  if (touched.value.preferredDate && form.value.preferredDate) {
    const selected = new Date(form.value.preferredDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selected < today) e.preferredDate = 'La fecha no puede ser en el pasado'
  }
  if (touched.value.address && form.value.modality === 'IN_PERSON' && form.value.address.trim().length < 5) {
    e.address = 'Ingresa una dirección más detallada'
  }
  if (touched.value.clientPhone && form.value.clientPhone.trim() && !PHONE_REGEX.test(form.value.clientPhone.trim())) {
    e.clientPhone = 'Ingresa un teléfono válido'
  }
  return e
})

watch(() => props.service, () => {
  form.value = defaultForm()
  errorMsg.value = ''
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    form.value.modality = modalityOptions.value[0]?.value ?? 'ANY'
  }
})

watch(() => user.value, (u) => {
  if (u) {
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
    address: true,
    clientPhone: true,
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

// Guarda la consulta inicial y redirige a login; se retoma al volver.
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

  if (!user.value) {
    redirectToLoginAndResume()
    return
  }

  sending.value = true
  try {
    const { post } = useApi()
    await post('/services/requests/inquiries', {
      serviceId: props.service.id,
      modality: form.value.modality,
      preferredDate: form.value.preferredDate || undefined,
      preferredTime: form.value.preferredTime || undefined,
      address: form.value.address || undefined,
      city: form.value.city || undefined,
      clientPhone: form.value.clientPhone || undefined,
      message: form.value.description || undefined,
    })
    emit('update:modelValue', false)
    emit('success')
    form.value = defaultForm()
    touched.value = {}
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'No se pudo enviar la consulta. Intenta de nuevo.'
  } finally {
    sending.value = false
  }
}

// Llamado por la página anfitriona cuando detecta un draft de solicitud
// pendiente tras volver de /login — rellena el formulario para que el usuario
// confirme el envío de la consulta con un click.
function applyDraftForm(draftForm: Record<string, unknown>) {
  form.value = { ...form.value, ...draftForm } as typeof form.value
}

defineExpose({ applyDraftForm })
</script>
