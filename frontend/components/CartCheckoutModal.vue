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
      <div v-if="modelValue" class="fixed inset-0 z-[450] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('update:modelValue', false)" />

        <Transition
          enter-active-class="duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
        >
          <div v-if="modelValue" class="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <!-- Handle mobile -->
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <!-- Header -->
            <div class="px-5 pt-4 pb-3 border-b border-gray-100">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-base font-black text-gray-900">Confirmar pedido</h2>
                  <p class="text-xs text-gray-400 mt-0.5">{{ totalItems }} {{ totalItems === 1 ? 'producto' : 'productos' }} · ${{ formatPrice(totalPrice) }}</p>
                </div>
                <button
                  class="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  @click="$emit('update:modelValue', false)"
                >
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <form class="px-5 py-4 space-y-4" @submit.prevent="submit">
              <!-- Resumen items -->
              <div class="bg-gray-50 rounded-2xl p-3 space-y-1.5">
                <template v-for="group in groups" :key="group.commerceId">
                  <p class="text-[11px] font-bold text-gray-500 uppercase tracking-wide pt-1 first:pt-0">{{ group.commerceName }}</p>
                  <div v-for="item in group.items" :key="item.product.id" class="flex justify-between text-xs">
                    <span class="text-gray-600 truncate mr-2">{{ item.quantity }}× {{ item.product.name }}</span>
                    <span class="font-semibold text-gray-800 flex-shrink-0">${{ formatPrice(item.product.price * item.quantity) }}</span>
                  </div>
                </template>
                <div class="pt-2 mt-1 border-t border-gray-200 flex justify-between text-sm font-black">
                  <span>Total</span>
                  <span class="text-red-600">${{ formatPrice(totalPrice) }}</span>
                </div>
              </div>

              <!-- Tipo de entrega -->
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">Tipo de entrega</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in deliveryOptions"
                    :key="opt.value"
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
                <div v-if="form.deliveryType === 'HOME_DELIVERY'" class="space-y-2.5">
                  <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">Dirección <span class="text-red-500">*</span></label>
                    <input
                      v-model="form.address"
                      type="text"
                      placeholder="Calle, número, barrio..."
                      required
                      class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                    />
                  </div>
                  <input
                    v-model="form.city"
                    type="text"
                    placeholder="Ciudad"
                    class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  />
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

              <!-- Error -->
              <p v-if="errorMsg" class="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-xl">{{ errorMsg }}</p>

              <!-- Submit -->
              <button
                type="submit"
                :disabled="sending"
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
import type { CartGroup } from '~/composables/useCart'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  modelValue: boolean
  groups: CartGroup[]
  totalPrice: number
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'success': []
}>()

const { user } = useAuth()

const deliveryOptions = [
  { value: 'HOME_DELIVERY', label: 'Domicilio', emoji: '🛵' },
  { value: 'PICKUP', label: 'Recoger', emoji: '🏪' },
  { value: 'DIGITAL', label: 'Digital', emoji: '💻' },
]

const totalItems = computed(() =>
  props.groups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0), 0)
)

const defaultForm = () => ({
  deliveryType: 'HOME_DELIVERY' as 'HOME_DELIVERY' | 'PICKUP' | 'DIGITAL',
  address: '',
  city: '',
  buyerName: user.value ? `${user.value.firstName} ${user.value.lastName}`.trim() : '',
  buyerPhone: (user.value as any)?.phone ?? '',
  buyerEmail: user.value?.email ?? '',
  notes: '',
})

const form = ref(defaultForm())
const sending = ref(false)
const errorMsg = ref('')

watch(() => props.modelValue, (val) => {
  if (val) { form.value = defaultForm(); errorMsg.value = '' }
})

watch(() => user.value, (u) => {
  if (u) {
    form.value.buyerName = `${u.firstName} ${u.lastName}`.trim()
    form.value.buyerEmail = u.email ?? ''
    form.value.buyerPhone = (u as any).phone ?? ''
  }
}, { immediate: true })

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

async function submit() {
  errorMsg.value = ''
  if (form.value.deliveryType === 'HOME_DELIVERY' && !form.value.address.trim()) {
    errorMsg.value = 'La dirección es requerida para entrega a domicilio.'
    return
  }
  if (props.groups.length === 0) return

  sending.value = true
  try {
    const { post } = useApi()
    // Send one order per commerce group
    await Promise.all(
      props.groups.map(group =>
        post('/catalog/orders', {
          commerceId: group.commerceId,
          commerceName: group.commerceName,
          items: group.items.map(i => ({
            productId: i.product.id,
            productName: i.product.name,
            quantity: i.quantity,
            unitPrice: i.product.price,
          })),
          deliveryType: form.value.deliveryType,
          address: form.value.address || undefined,
          city: form.value.city || undefined,
          buyerName: form.value.buyerName,
          buyerPhone: form.value.buyerPhone,
          buyerEmail: form.value.buyerEmail || undefined,
          notes: form.value.notes || undefined,
          totalEstimate: group.subtotal,
        })
      )
    )
    emit('update:modelValue', false)
    emit('success')
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'No se pudo enviar el pedido. Intenta de nuevo.'
  } finally {
    sending.value = false
  }
}
</script>
