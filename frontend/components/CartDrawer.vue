<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm"
        @click="closeCart"
      />
    </Transition>

    <!-- Drawer -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="isOpen"
        class="fixed top-0 right-0 bottom-0 z-[410] w-full sm:w-[420px] bg-white shadow-2xl flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <div>
              <h2 class="font-black text-gray-900 text-base leading-tight">Mi Carrito</h2>
              <p class="text-xs text-gray-400 leading-tight">{{ totalItems }} {{ totalItems === 1 ? 'producto' : 'productos' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="items.length > 0"
              class="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
              @click="clearAll"
            >Vaciar</button>
            <button
              class="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              @click="closeCart"
            >
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="items.length === 0" class="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-5">
            <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <p class="text-base font-bold text-gray-800 mb-1">Tu carrito está vacío</p>
          <p class="text-sm text-gray-400 mb-6">Agrega productos para comenzar tu pedido</p>
          <button
            class="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
            @click="closeCart"
          >Explorar productos</button>
        </div>

        <!-- Items list -->
        <div v-else class="flex-1 overflow-y-auto px-4 py-3 space-y-4 cart-scroll">
          <div v-for="group in groupedByCommerce" :key="group.commerceId" class="space-y-2">
            <!-- Commerce header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg class="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
                  </svg>
                </div>
                <span class="text-xs font-bold text-gray-700 truncate max-w-[180px]">{{ group.commerceName }}</span>
              </div>
              <button
                class="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium"
                @click="clearCommerce(group.commerceId)"
              >Quitar todo</button>
            </div>

            <!-- Products of this commerce -->
            <div class="space-y-2">
              <div
                v-for="item in group.items"
                :key="item.product.id"
                class="flex gap-3 bg-gray-50 rounded-2xl p-3 hover:bg-gray-100 transition-colors"
              >
                <!-- Image -->
                <div class="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                  <img
                    v-if="item.product.image"
                    :src="item.product.image"
                    :alt="item.product.name"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                    <svg class="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 line-clamp-1 leading-snug">{{ item.product.name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    ${{ formatPrice(item.product.price) }}
                    <span v-if="item.product.unit && item.product.unit !== 'unidad'">/ {{ item.product.unit }}</span>
                  </p>

                  <!-- Quantity controls -->
                  <div class="flex items-center gap-2 mt-2">
                    <div class="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <button
                        class="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors font-bold text-base"
                        @click="decrement(item.product.id)"
                      >−</button>
                      <span class="w-8 text-center text-sm font-black text-gray-900">{{ item.quantity }}</span>
                      <button
                        class="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors font-bold text-base"
                        :disabled="item.quantity >= 99"
                        @click="increment(item.product.id)"
                      >+</button>
                    </div>
                    <span class="ml-auto text-sm font-black text-red-600">${{ formatPrice(item.product.price * item.quantity) }}</span>
                    <button
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      @click="removeItem(item.product.id)"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Commerce subtotal -->
            <div class="flex justify-between items-center px-1 pt-1 border-t border-gray-200/60">
              <span class="text-xs text-gray-400 font-medium">Subtotal {{ group.commerceName }}</span>
              <span class="text-sm font-bold text-gray-700">${{ formatPrice(group.subtotal) }}</span>
            </div>
          </div>
        </div>

        <!-- Footer: resumen + checkout -->
        <div v-if="items.length > 0" class="flex-shrink-0 border-t border-gray-100 bg-white px-5 py-4 space-y-3">
          <!-- Desglose -->
          <div class="space-y-1.5">
            <div class="flex justify-between text-xs text-gray-500">
              <span>Subtotal ({{ totalItems }} {{ totalItems === 1 ? 'producto' : 'productos' }})</span>
              <span>${{ formatPrice(totalPrice) }}</span>
            </div>
            <div class="flex justify-between text-xs text-gray-400">
              <span>Envío</span>
              <span class="text-emerald-600 font-semibold">A coordinar con el comercio</span>
            </div>
          </div>

          <!-- Total -->
          <div class="flex items-center justify-between py-2 border-t border-gray-100">
            <span class="text-sm font-bold text-gray-900">Total estimado</span>
            <span class="text-xl font-black text-red-600">${{ formatPrice(totalPrice) }}</span>
          </div>

          <!-- Checkout button -->
          <button
            class="w-full py-3.5 bg-red-600 text-white font-black text-sm rounded-2xl hover:bg-red-700 active:scale-[0.98] transition-all duration-200 shadow-sm shadow-red-200 flex items-center justify-center gap-2"
            @click="checkout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
            Confirmar pedido
          </button>
          <p class="text-center text-[11px] text-gray-400">
            El comercio te contactará para coordinar pago y entrega
          </p>
        </div>
      </div>
    </Transition>

    <!-- Checkout modal -->
    <CartCheckoutModal
      v-model="showCheckout"
      :groups="groupedByCommerce"
      :total-price="totalPrice"
      @success="onCheckoutSuccess"
    />

    <!-- Toast -->
    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="successToast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 whitespace-nowrap"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        ¡Pedido enviado! El comercio se pondrá en contacto contigo.
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCart } from '~/composables/useCart'

const {
  items, isOpen, totalItems, totalPrice, groupedByCommerce,
  removeItem, increment, decrement, clearAll, clearCommerce, closeCart,
} = useCart()

const showCheckout = ref(false)
const successToast = ref(false)

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

function checkout() {
  closeCart()
  showCheckout.value = true
}

function onCheckoutSuccess() {
  clearAll()
  successToast.value = true
  setTimeout(() => { successToast.value = false }, 4000)
}
</script>

<style scoped>
.cart-scroll::-webkit-scrollbar { width: 4px; }
.cart-scroll::-webkit-scrollbar-track { background: transparent; }
.cart-scroll::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.3); border-radius: 9999px; }
.cart-scroll::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.5); }
</style>
