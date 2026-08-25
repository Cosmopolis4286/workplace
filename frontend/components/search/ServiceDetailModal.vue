<template>
  <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
    leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="service" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0">
        <div v-if="service" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="relative aspect-video bg-blue-50 rounded-t-3xl overflow-hidden">
            <img v-if="service.images?.[0]" :src="imageSrc(service.images[0])" :alt="service.name" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <svg class="w-16 h-16 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div v-if="service.category" class="absolute top-3 left-3">
              <span class="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow" :style="{ backgroundColor: service.category.color || '#3B82F6' }">{{ service.category.name }}</span>
            </div>
            <button class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors" @click="$emit('close')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between gap-3 mb-2">
              <h2 class="text-xl font-black text-gray-900 leading-tight">{{ service.name }}</h2>
              <div class="text-right flex-shrink-0">
                <span class="text-2xl font-black text-blue-600">${{ formatPrice(service.price) }}</span>
                <p v-if="service.priceUnit" class="text-xs text-gray-400">/ {{ service.priceUnit }}</p>
                <div v-if="defaultRate && service.price" class="text-xs text-gray-500">
                  {{ defaultRate.symbol }} {{ formatNumber(service.price * defaultRate.rateToUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </div>
              </div>
            </div>
            <p v-if="service.description" class="text-sm text-gray-500 mb-4 leading-relaxed">{{ service.description }}</p>
            <div class="flex flex-wrap gap-2 mb-4">
              <!-- Proveedor -->
              <div class="flex items-center gap-2 w-full">
                <div class="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
                  <img v-if="service.user.avatar" :src="avatarSrc(service.user.avatar)" :alt="service.user.firstName" class="w-full h-full object-cover" />
                  <span v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-blue-600">
                    {{ service.user.firstName[0] }}{{ service.user.lastName[0] }}
                  </span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-800">{{ service.user.firstName }} {{ service.user.lastName }}</p>
                  <p v-if="service.user.category" class="text-xs text-gray-400">{{ service.user.subcategory?.name ?? service.user.category.name }}</p>
                </div>
              </div>
              <!-- Rating del proveedor -->
              <div class="flex items-center gap-1">
                <div class="flex items-center gap-0.5">
                  <template v-for="n in 5" :key="n">
                    <svg class="w-3.5 h-3.5" :class="n <= Math.round(service.user.rating ?? 0) ? 'text-amber-400' : 'text-gray-200'" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </template>
                </div>
                <span v-if="service.user.rating" class="text-xs font-semibold text-gray-600">{{ service.user.rating.toFixed(1) }}</span>
                <span v-else class="text-xs text-gray-400">Sin reseñas</span>
                <span v-if="service.user.reviewsCount > 0" class="text-[11px] text-gray-400">({{ service.user.reviewsCount }})</span>
              </div>
              <span v-if="service.duration" class="flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ service.duration }} min estimados
              </span>
            </div>
            <!-- Tags -->
            <div v-if="service.tags.length" class="flex flex-wrap gap-1.5 mb-4">
              <span v-for="tag in service.tags" :key="tag" class="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100">{{ tag }}</span>
            </div>
            <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
              <NuxtLink v-if="service.user.username" :to="`/p/${service.user.username}`"
                class="flex-shrink-0 text-xs font-semibold text-blue-600 py-2.5 px-4 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
                @click="$emit('profile-visit')">
                Ver perfil
              </NuxtLink>
              <button
                v-if="!isOwnService"
                class="flex-1 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-200 shadow-sm shadow-blue-200"
                @click="$emit('request')">
                Solicitar Servicio
              </button>
              <span v-else class="flex-1 text-center text-sm font-semibold text-gray-400 py-2.5 bg-gray-100 rounded-xl">
                Este es tu servicio
              </span>
            </div>
            <button
              v-if="!isOwnService"
              type="button"
              class="w-full mt-2 text-xs text-gray-400 hover:text-red-500 font-medium"
              @click="$emit('report')"
            >
              ¿Algo sospechoso con este servicio? Reportarlo
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import { useDateFormat } from '~/composables/core/useDateFormat'
import type { CatalogService } from '~/composables/services/useServices'
import type { ExchangeRate } from '~/composables/wallets/useExchangeRates'

defineProps<{
  service: CatalogService | null
  isOwnService: boolean
  defaultRate: ExchangeRate | null
}>()

defineEmits<{
  close: []
  request: []
  report: []
  'profile-visit': []
}>()

const { getAssetUrl } = useAssetUrl()
const { formatNumber } = useDateFormat()
function avatarSrc(avatar: string) { return getAssetUrl(avatar) ?? '' }
function imageSrc(image: string) { return getAssetUrl(image) ?? '' }
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}
</script>
