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
                  <!-- Imagen producto mini -->
                  <div class="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img v-if="product?.image" :src="product.image" :alt="product.name" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                      <svg class="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div class="flex items-center gap-1.5">
                      <h2 class="text-base font-black text-gray-900 leading-tight">{{ product?.name }}</h2>
                      <span v-if="product?.isBundle" class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700">📦 Pack</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-0.5">{{ product?.commerce?.name }}</p>
                  </div>
                </div>
                <button class="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0" @click="$emit('update:modelValue', false)">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- ─── Formulario ─────────────────────────────────────────── -->
            <form class="px-5 py-4 space-y-4" @submit.prevent="submit">

              <!-- Cantidad -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">Cantidad</label>
                <div class="flex items-center gap-3">
                  <button type="button" class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors font-bold text-gray-700 text-lg disabled:opacity-40"
                    :disabled="form.quantity <= 1" @click="form.quantity--">−</button>
                  <span class="w-10 text-center font-black text-xl text-gray-900">{{ form.quantity }}</span>
                  <button type="button" class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors font-bold text-gray-700 text-lg disabled:opacity-40"
                    :disabled="form.quantity >= 99" @click="form.quantity++">+</button>
                  <div class="ml-auto">
                    <span class="text-2xl font-black text-red-600">${{ formatPrice(totalEstimate) }}</span>
                    <p class="text-[11px] text-gray-400 text-right">estimado</p>
                  </div>
                </div>
              </div>

              <!-- Tipo de entrega -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">Tipo de entrega</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in deliveryOptions" :key="opt.value"
                    type="button"
                    class="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all duration-200"
                    :class="form.deliveryType === opt.value
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
                    @click="form.deliveryType = opt.value"
                  >
                    <span class="text-xl">{{ opt.emoji }}</span>
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Dirección (solo domicilio) -->
              <Transition
                enter-active-class="duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="form.deliveryType === 'HOME_DELIVERY'" class="space-y-3">
                  <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">Dirección de entrega <span class="text-red-500">*</span></label>
                    <input
                      v-model="form.address"
                      type="text"
                      placeholder="Calle, número, barrio..."
                      required
                      class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">Ciudad</label>
                    <input
                      v-model="form.city"
                      type="text"
                      placeholder="Ciudad"
                      class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                    />
                  </div>
                </div>
              </Transition>

              <!-- Datos de contacto -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">Tus datos de contacto</label>
                <div class="space-y-2.5">
                  <input
                    v-model="form.buyerName"
                    type="text"
                    placeholder="Nombre completo *"
                    required
                    maxlength="100"
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  />
                  <input
                    v-model="form.buyerPhone"
                    type="tel"
                    placeholder="Teléfono / WhatsApp *"
                    required
                    maxlength="30"
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  />
                  <input
                    v-model="form.buyerEmail"
                    type="email"
                    placeholder="Correo electrónico (opcional)"
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  />
                </div>
              </div>

              <!-- Notas -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1.5">Notas del pedido</label>
                <textarea
                  v-model="form.notes"
                  placeholder="Sin cebolla, extra salsa, instrucciones especiales..."
                  maxlength="500"
                  rows="2"
                  class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-none"
                />
              </div>

              <!-- KYC banner -->
              <p v-if="kycStatus && kycStatus !== 'APPROVED'" class="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-2 rounded-xl">
                Debes verificar tu identidad antes de pedir.
                <NuxtLink to="/verification" class="font-semibold underline" @click="$emit('update:modelValue', false)">Completa la verificación</NuxtLink>.
              </p>

              <!-- Error -->
              <p v-if="errorMsg" class="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-xl">{{ errorMsg }}</p>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="sending || (kycStatus !== undefined && kycStatus !== 'APPROVED')"
                class="w-full py-3.5 bg-red-600 text-white font-black text-sm rounded-2xl hover:bg-red-700 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-red-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span v-if="sending" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{{ sending ? 'Enviando pedido...' : '¡Confirmar pedido!' }}</span>
              </button>

              <p class="text-center text-[11px] text-gray-400">
                El comercio recibirá tu solicitud y te contactará para coordinar el pago y entrega.
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
import { useApi } from '~/composables/core/useApi'
import { useAuth } from '~/composables/auth/useAuth'
import { useKyc } from '~/composables/kyc/useKyc'
import { useCheckoutResume } from '~/composables/catalog/useCheckoutResume'

const props = defineProps<{
  modelValue: boolean
  product: CatalogProduct | null
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
const { saveCheckoutDraft } = useCheckoutResume()

watch(() => props.modelValue, (open) => {
  if (open) fetchMyKycStatus()
})

const deliveryOptions = [
  { value: 'HOME_DELIVERY', label: 'Domicilio', emoji: '🛵' },
  { value: 'PICKUP', label: 'Recoger', emoji: '🏪' },
  { value: 'DIGITAL', label: 'Digital', emoji: '💻' },
]

const defaultForm = () => ({
  quantity: 1,
  deliveryType: 'HOME_DELIVERY' as 'HOME_DELIVERY' | 'PICKUP' | 'DIGITAL',
  address: '',
  city: '',
  buyerName: user.value ? `${user.value.firstName} ${user.value.lastName}`.trim() : '',
  buyerPhone: user.value?.phone ?? '',
  buyerEmail: user.value?.email ?? '',
  notes: '',
})

const form = ref(defaultForm())
const sending = ref(false)
const errorMsg = ref('')

// Reset when product changes
watch(() => props.product, () => {
  form.value = defaultForm()
  errorMsg.value = ''
})

// Pre-fill user data
watch(() => user.value, (u) => {
  if (u) {
    form.value.buyerName = `${u.firstName} ${u.lastName}`.trim()
    form.value.buyerEmail = u.email ?? ''
    form.value.buyerPhone = (u as any).phone ?? ''
  }
}, { immediate: true })

const totalEstimate = computed(() => {
  if (!props.product) return 0
  return props.product.price * form.value.quantity
})

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

// Guarda la selección actual y redirige a login — se retoma automáticamente
// al volver (ver checkoutResume.ts), sin perder lo que el visitante ya llenó.
function redirectToLoginAndResume() {
  if (!props.product) return
  saveCheckoutDraft({
    kind: 'catalog-order',
    productId: props.product.id,
    form: form.value,
  })
  const currentPath = route.fullPath
  const target = currentPath.includes('?') ? `${currentPath}&intent=checkout` : `${currentPath}?intent=checkout`
  navigateTo(`/login?redirect=${encodeURIComponent(target)}`)
}

async function submit() {
  if (!props.product) return
  errorMsg.value = ''

  if (!user.value) {
    redirectToLoginAndResume()
    return
  }

  if (form.value.deliveryType === 'HOME_DELIVERY' && !form.value.address.trim()) {
    errorMsg.value = 'La dirección es requerida para entrega a domicilio.'
    return
  }

  sending.value = true
  try {
    const { post } = useApi()
    await post('/catalog/orders', {
      commerceId: props.product.commerce.id,
      items: [{ productId: props.product.id, quantity: form.value.quantity }],
      deliveryType: form.value.deliveryType,
      address: form.value.address || undefined,
      city: form.value.city || undefined,
      buyerName: form.value.buyerName,
      buyerPhone: form.value.buyerPhone,
      buyerEmail: form.value.buyerEmail || undefined,
      notes: form.value.notes || undefined,
    })
    emit('update:modelValue', false)
    emit('success')
    form.value = defaultForm()
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'No se pudo enviar el pedido. Intenta de nuevo.'
  } finally {
    sending.value = false
  }
}

// Llamado por la página anfitriona (loja/[slug].vue) cuando detecta un
// draft de checkout pendiente tras volver de /login — rellena el formulario
// pero deja que el usuario confirme el envío con un click, en vez de
// auto-enviar (evita un pedido duplicado por doble submit accidental).
function applyDraftForm(draftForm: Record<string, unknown>) {
  form.value = { ...form.value, ...draftForm } as typeof form.value
}

defineExpose({ applyDraftForm })
</script>
