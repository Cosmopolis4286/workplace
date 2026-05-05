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
          <div v-if="modelValue" class="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

            <!-- Handle mobile -->
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <!-- Header -->
            <div class="px-5 pt-4 pb-3 border-b border-gray-100">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl overflow-hidden bg-blue-50 flex-shrink-0">
                    <img v-if="service?.image" :src="imageSrc(service.image)" :alt="service.name" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <svg class="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h2 class="text-base font-black text-gray-900 leading-tight">{{ service?.name }}</h2>
                    <p class="text-xs text-gray-400 mt-0.5">{{ service?.user?.firstName }} {{ service?.user?.lastName }}</p>
                  </div>
                </div>
                <button class="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0" @click="$emit('update:modelValue', false)">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

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

              <!-- Fecha preferida -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1.5">Fecha preferida <span class="text-blue-500">*</span></label>
                <input
                  v-model="form.preferredDate"
                  type="date"
                  required
                  :min="minDate"
                  class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
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
                <div v-if="form.modality === 'PRESENCIAL'" class="space-y-3">
                  <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">Dirección <span class="text-blue-500">*</span></label>
                    <input
                      v-model="form.address"
                      type="text"
                      placeholder="Calle, número, barrio..."
                      required
                      class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">Ciudad</label>
                    <input
                      v-model="form.city"
                      type="text"
                      placeholder="Ciudad"
                      class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
              </Transition>

              <!-- Datos de contacto -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">Tus datos de contacto</label>
                <div class="space-y-2.5">
                  <input
                    v-model="form.clientName"
                    type="text"
                    placeholder="Nombre completo *"
                    required
                    maxlength="100"
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <input
                    v-model="form.clientPhone"
                    type="tel"
                    placeholder="Teléfono / WhatsApp *"
                    required
                    maxlength="30"
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <input
                    v-model="form.clientEmail"
                    type="email"
                    placeholder="Correo electrónico (opcional)"
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
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
                />
              </div>

              <!-- Precio -->
              <div class="flex items-center justify-between bg-blue-50 rounded-2xl px-4 py-3">
                <span class="text-xs font-bold text-blue-700">Precio del servicio</span>
                <div class="text-right">
                  <div>
                    <span class="text-xl font-black text-blue-600">${{ formatPrice(service?.price ?? 0) }}</span>
                    <span v-if="service?.priceUnit" class="text-xs text-blue-400 ml-1">/ {{ service.priceUnit }}</span>
                  </div>
                  <div v-if="convertedPrice && defaultRate" class="text-xs text-blue-400 mt-0.5">
                    {{ defaultRate.symbol }} {{ convertedPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    <span v-if="service?.priceUnit"> / {{ service.priceUnit }}</span>
                  </div>
                </div>
              </div>

              <!-- Error -->
              <p v-if="errorMsg" class="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-xl">{{ errorMsg }}</p>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="sending"
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
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { useExchangeRates } from '~/composables/useExchangeRates'

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
const { user } = useAuth()
const { defaultRate } = useExchangeRates()

const convertedPrice = computed(() => {
  const price = props.service?.price
  if (!price || !defaultRate.value) return null
  return price * defaultRate.value.rateToUsd
})

const ALL_MODALITY_OPTIONS: Record<string, { label: string; emoji: string }> = {
  PRESENCIAL: { label: 'Presencial', emoji: '📍' },
  REMOTO: { label: 'Remoto', emoji: '💻' },
  CUALQUIERA: { label: 'Cualquiera', emoji: '🤝' },
}

const modalityOptions = computed(() => {
  const vals = props.service?.modalities?.length
    ? props.service.modalities
    : ['PRESENCIAL', 'REMOTO', 'CUALQUIERA']
  return vals.map(v => ({
    value: v,
    label: ALL_MODALITY_OPTIONS[v]?.label ?? v,
    emoji: ALL_MODALITY_OPTIONS[v]?.emoji ?? '📋',
  }))
})

const minDate = new Date().toISOString().split('T')[0]

const defaultForm = () => ({
  modality: (modalityOptions.value[0]?.value ?? 'CUALQUIERA') as string,
  preferredDate: '',
  address: '',
  city: '',
  clientName: user.value ? `${user.value.firstName} ${user.value.lastName}`.trim() : '',
  clientPhone: (user.value as any)?.phone ?? '',
  clientEmail: user.value?.email ?? '',
  description: '',
})

const form = ref(defaultForm())
const sending = ref(false)
const errorMsg = ref('')

watch(() => props.service, () => {
  form.value = defaultForm()
  errorMsg.value = ''
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    form.value.modality = modalityOptions.value[0]?.value ?? 'CUALQUIERA'
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

async function submit() {
  if (!props.service) return
  errorMsg.value = ''

  if (form.value.modality === 'PRESENCIAL' && !form.value.address.trim()) {
    errorMsg.value = 'La dirección es requerida para modalidad presencial.'
    return
  }

  sending.value = true
  try {
    const { post } = useApi()
    await post('/services/requests', {
      serviceId: props.service.id,
      serviceName: props.service.name,
      providerId: props.service.user.id,
      providerName: `${props.service.user.firstName} ${props.service.user.lastName}`,
      modality: form.value.modality,
      preferredDate: form.value.preferredDate,
      address: form.value.address || undefined,
      city: form.value.city || undefined,
      clientName: form.value.clientName,
      clientPhone: form.value.clientPhone,
      clientEmail: form.value.clientEmail || undefined,
      description: form.value.description || undefined,
      price: props.service.price,
      priceUnit: props.service.priceUnit || undefined,
    })
    emit('update:modelValue', false)
    emit('success')
    form.value = defaultForm()
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'No se pudo enviar la solicitud. Intenta de nuevo.'
  } finally {
    sending.value = false
  }
}
</script>
