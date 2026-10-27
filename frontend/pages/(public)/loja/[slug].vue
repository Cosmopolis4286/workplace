<template>
  <NuxtLayout :name="layout">
    <div class="max-w-5xl mx-auto px-4 py-6">

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-6">
        <div class="card-premium p-6 animate-pulse flex gap-6">
          <div class="h-24 w-24 rounded-2xl bg-gray-200 flex-shrink-0" />
          <div class="flex-1 space-y-3 pt-2">
            <div class="h-6 bg-gray-200 rounded w-48" />
            <div class="h-4 bg-gray-200 rounded w-32" />
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="i in 6" :key="i" class="card-premium p-3 animate-pulse">
            <div class="aspect-square bg-gray-200 rounded-xl mb-2" />
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-1" />
            <div class="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>

      <!-- Not found -->
      <div v-else-if="error || !store" class="card-premium p-12 text-center">
        <div class="text-5xl mb-4">🏪</div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Tienda no encontrada</h2>
        <p class="text-gray-500 mb-6">Esta tienda no existe o el link ya no está disponible.</p>
        <NuxtLink to="/" class="inline-flex items-center gap-2 px-5 py-2.5 bg-workplace-red text-white rounded-xl font-semibold">
          Volver al inicio
        </NuxtLink>
      </div>

      <template v-else>
        <!-- ── Header de la tienda ─────────────────────────────────────── -->
        <div class="card-premium overflow-hidden mb-6">
          <div class="relative h-32 sm:h-40 bg-gradient-to-br from-workplace-red/80 to-red-800">
            <img v-if="coverSrc" :src="coverSrc" alt="Portada" class="h-full w-full object-cover">
          </div>

          <div class="px-6 pb-6">
            <div class="flex flex-col sm:flex-row gap-4 items-start">
              <div class="flex-shrink-0 relative -mt-12">
                <div class="h-24 w-24 rounded-2xl overflow-hidden ring-4 ring-white shadow-xl bg-white">
                  <img v-if="avatarSrc" :src="avatarSrc" :alt="store.name" class="h-full w-full object-cover">
                  <div v-else class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center">
                    <span class="text-2xl font-bold text-white">{{ initials }}</span>
                  </div>
                </div>
              </div>

              <div class="flex-1 pt-2 sm:pt-4">
                <div class="flex items-start justify-between gap-3">
                  <h1 class="text-2xl font-black text-gray-900">{{ store.name }}</h1>
                  <button
                    class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                    @click="showShareModal = true"
                  >
                    <ShareIcon class="h-3.5 w-3.5" />
                    Compartir
                  </button>
                </div>
                <p v-if="store.type" class="text-sm text-gray-500 mt-0.5">{{ store.type }}</p>
                <!-- Solo si el dueño activó perfil profesional con slug
                     propio ("opción 2": también cotiza trabajos a medida,
                     no solo vende del catálogo de precio fijo). -->
                <NuxtLink
                  v-if="store.professionalSlug"
                  :to="`/pro/${store.professionalSlug}`"
                  class="inline-block text-sm text-workplace-red font-semibold hover:underline mt-0.5"
                >
                  Ver perfil profesional →
                </NuxtLink>

                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span v-if="store.avgRating" class="flex items-center gap-1 font-semibold text-gray-700">
                    <StarIcon class="h-4 w-4 text-amber-400" />
                    {{ store.avgRating.toFixed(1) }}
                    <span class="text-gray-400 font-normal">({{ store.reviewsCount }})</span>
                  </span>
                  <ReputationBadge entity-type="COMMERCE" :entity-id="store.id" />
                  <span v-if="store.address" class="flex items-center gap-1">
                    <MapPinIcon class="h-4 w-4" />
                    {{ store.address }}
                  </span>
                  <span v-if="store.phone" class="flex items-center gap-1">
                    <PhoneIcon class="h-4 w-4" />
                    {{ store.phone }}
                  </span>
                </div>

                <p v-if="store.schedule" class="mt-3 text-sm text-gray-600 whitespace-pre-line">{{ store.schedule }}</p>
                <p v-if="store.description" class="mt-2 text-sm text-gray-700">{{ store.description }}</p>

                <div v-if="hasSocialLinks" class="flex flex-wrap gap-3 mt-3">
                  <a
                    v-for="link in socialLinksList"
                    :key="link.key"
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs font-semibold text-workplace-red hover:underline"
                  >
                    {{ link.label }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Catálogo ─────────────────────────────────────────────────── -->
        <div v-if="catalogLoading && products.length === 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="i in 6" :key="i" class="card-premium p-3 animate-pulse">
            <div class="aspect-square bg-gray-200 rounded-xl mb-2" />
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-1" />
            <div class="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div v-else-if="products.length === 0" class="card-premium text-center py-16 text-gray-400">
          <div class="text-5xl mb-3">🛍️</div>
          <p class="font-medium">Sin productos disponibles</p>
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            v-for="product in products"
            :key="product.id"
            class="card-premium overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
            @click="openOrderModal(product)"
          >
            <div class="aspect-square bg-gray-100 relative overflow-hidden">
              <img
                v-if="product.image"
                :src="getAssetUrl(product.image) ?? undefined"
                :alt="product.name"
                class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              >
              <div v-else class="h-full w-full flex items-center justify-center">
                <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="bg-white text-red-600 font-bold text-xs px-3 py-1.5 rounded-full shadow">Pedir</span>
              </div>
            </div>
            <div class="p-3">
              <p class="font-semibold text-gray-900 text-sm line-clamp-1">{{ product.name }}</p>
              <p class="text-red-600 font-black text-sm mt-0.5">${{ new Intl.NumberFormat('es-CO').format(product.price) }}</p>
              <p v-if="product.category?.name" class="text-xs text-gray-400 mt-0.5">{{ product.category.name }}</p>
            </div>
          </div>
        </div>
        <div v-if="products.length < productsTotal" class="mt-6 text-center">
          <button
            class="px-6 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            :disabled="catalogLoading"
            @click="fetchProducts(productsPage + 1)"
          >
            <span v-if="catalogLoading" class="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
            Cargar más
          </button>
        </div>

        <!-- Toast pedido -->
        <Teleport to="body">
          <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div v-if="orderToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold">
              {{ orderToast }}
            </div>
          </Transition>
        </Teleport>
      </template>
    </div>

    <!-- ── Modal: Order (catálogo) ──────────────────────────────────────── -->
    <CatalogOrderModal
      ref="orderModalRef"
      v-model="showOrderModal"
      :product="orderTarget"
      @success="onOrderSuccess"
    />

    <!-- ── Modal: Compartir ─────────────────────────────────────────────── -->
    <ShareStoreModal
      v-model="showShareModal"
      :url="shareUrl"
      :title="store?.name"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { StarIcon, MapPinIcon, PhoneIcon, ShareIcon } from '@heroicons/vue/24/outline'
import CatalogOrderModal from '~/components/modals/CatalogOrderModal.vue'
import ShareStoreModal from '~/components/modals/ShareStoreModal.vue'
import { useApi } from '~/composables/core/useApi'
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import { useAuth } from '~/composables/auth/useAuth'
import { useCheckoutResume } from '~/composables/catalog/useCheckoutResume'

interface PublicStore {
  id: string
  name: string
  type: string | null
  address: string | null
  phone: string | null
  email: string | null
  schedule: string | null
  slug: string
  avgRating: number | null
  reviewsCount: number
  productCount: number
  description: string | null
  socialLinks: { instagram?: string; facebook?: string; whatsapp?: string; tiktok?: string } | null
  user: { avatar: string | null; coverImage: string | null }
  settings: { avgPrepTime: number | null; avgDeliveryTime: number | null; deliveryFee: number | null; freeDeliveryMinimum: number | null } | null
  // Solo presente si el dueño tiene FreelancerSettings con slug propio —
  // un Commerce puede pertenecer a un PROFESIONAL que también cotiza
  // trabajos a medida ("opción 2"), ver ProfilesService.getStoreBySlug.
  professionalSlug: string | null
}

const route = useRoute()
const { get } = useApi()
const { getAssetUrl } = useAssetUrl()
const { isAuthenticated } = useAuth()
const config = useRuntimeConfig()

const layout = computed(() => isAuthenticated.value ? 'default' : 'public')

const slug = computed(() => String(route.params.slug ?? ''))

const store = ref<PublicStore | null>(null)
const loading = ref(true)
const error = ref(false)

const coverSrc = computed(() => getAssetUrl(store.value?.user?.coverImage))
const avatarSrc = computed(() => getAssetUrl(store.value?.user?.avatar))
const initials = computed(() => (store.value?.name ?? '?').trim().charAt(0).toUpperCase())

const showShareModal = ref(false)
const shareUrl = computed(() => `${config.public.siteUrl}/loja/${slug.value}`)

// SEO/compartir: solo se completa una vez que el fetch resuelve (SPA sin
// SSR — no indexa a crawlers que no ejecutan JS, pero sí mejora el title
// tab y las OG tags al compartir el link por WhatsApp/redes).
useSeoMeta({
  title: () => store.value ? `${store.value.name} | WorkPlace` : 'Tienda | WorkPlace',
  description: () => store.value?.description || `Catálogo de ${store.value?.name ?? 'esta tienda'} en WorkPlace`,
  ogTitle: () => store.value?.name,
  ogDescription: () => store.value?.description || undefined,
  ogImage: () => avatarSrc.value || coverSrc.value || undefined,
  ogUrl: () => `${config.public.siteUrl}/loja/${slug.value}`,
})

const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', tiktok: 'TikTok',
}
const socialLinksList = computed(() => {
  const links = store.value?.socialLinks
  if (!links) return []
  return Object.entries(links)
    .filter(([, url]) => !!url)
    .map(([key, url]) => ({ key, url: url as string, label: SOCIAL_LABELS[key] ?? key }))
})
const hasSocialLinks = computed(() => socialLinksList.value.length > 0)

async function fetchStore() {
  loading.value = true
  error.value = false
  try {
    const res = await get<{ data: PublicStore }>(`/catalog/store/${encodeURIComponent(slug.value)}`)
    store.value = res.data
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// ─── Catálogo de la tienda ─────────────────────────────────────────────────
const products = ref<any[]>([])
const productsTotal = ref(0)
const productsPage = ref(1)
const catalogLoading = ref(false)
const showOrderModal = ref(false)
const orderTarget = ref<any>(null)
const orderToast = ref('')
const orderModalRef = ref<InstanceType<typeof CatalogOrderModal> | null>(null)
const { consumeCheckoutDraft } = useCheckoutResume()

async function fetchProducts(page = 1) {
  if (!store.value?.id) return
  catalogLoading.value = true
  try {
    const res = await get<{ data: any[]; total: number }>(
      `/catalog/products?commerceId=${store.value.id}&limit=12&page=${page}`,
    )
    if (page === 1) products.value = res.data
    else products.value.push(...res.data)
    productsTotal.value = res.total
    productsPage.value = page
  } finally {
    catalogLoading.value = false
  }
}

function openOrderModal(p: any) {
  orderTarget.value = p
  showOrderModal.value = true
}

function onOrderSuccess() {
  orderToast.value = '¡Pedido enviado! El comercio te contactará pronto.'
  setTimeout(() => { orderToast.value = '' }, 4000)
}

// Redirect-and-resume: si el visitante llegó de /login tras haber intentado
// pedir sin sesión, reabre el modal con lo que ya había llenado.
async function resumeCheckoutIfNeeded() {
  if (route.query.intent !== 'checkout') return
  const draft = consumeCheckoutDraft()
  if (!draft || draft.kind !== 'catalog-order') return
  try {
    const res = await get<{ data: any }>(`/catalog/products/${draft.productId}`)
    orderTarget.value = res.data
    showOrderModal.value = true
    await nextTick()
    orderModalRef.value?.applyDraftForm(draft.form)
  } catch {
    // Producto ya no disponible — no interrumpe la carga normal de la página.
  }
}

onMounted(async () => {
  await fetchStore()
  if (store.value) await fetchProducts(1)
  await resumeCheckoutIfNeeded()
})
</script>
