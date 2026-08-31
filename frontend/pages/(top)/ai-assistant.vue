<template>
  <div>
    <PageHeader
      title="Asistente IA"
      description="Contale a WorkPlace qué necesitás y te mostramos opciones."
      :icon="SparklesIcon"
      :breadcrumb="[{ label: 'Asistente IA' }]"
    />

    <!-- Formulario de búsqueda -->
    <div class="card p-5 mb-6">
      <form class="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end" @submit.prevent="onSearch">
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1.5">¿Qué necesitás?</label>
          <select
            v-model="categoryId"
            required
            class="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-workplace-red focus:ring-2 focus:ring-red-100 bg-white"
          >
            <option value="" disabled>Selecciona una categoría</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.icon || '🔧' }} {{ cat.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1.5">Presupuesto máx. (opcional)</label>
          <input
            v-model.number="budgetMax"
            type="number"
            min="0"
            step="1"
            placeholder="$"
            class="w-full sm:w-32 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-workplace-red focus:ring-2 focus:ring-red-100"
          />
        </div>
        <button
          type="submit"
          :disabled="searching || !categoryId"
          class="px-6 py-2.5 bg-workplace-red text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {{ searching ? 'Buscando...' : 'Buscar' }}
        </button>
      </form>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-6">
      <p class="text-sm font-semibold text-red-700">{{ error }}</p>
    </div>

    <!-- Skeleton -->
    <div v-if="searching" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="n in 3" :key="n" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse space-y-2">
        <div class="h-4 bg-gray-200 rounded w-3/4" />
        <div class="h-3 bg-gray-200 rounded w-full" />
        <div class="h-8 bg-gray-200 rounded-xl w-full mt-3" />
      </div>
    </div>

    <!-- Resultados -->
    <template v-else-if="lastSearch">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm font-bold text-gray-800">
          <span class="text-workplace-red">{{ lastSearch.total }}</span>
          {{ lastSearch.total === 1 ? ' opción encontrada' : ' opciones encontradas' }}
          para <strong>{{ lastSearch.category }}</strong>
          <span v-if="lastSearch.budgetMax"> con hasta ${{ lastSearch.budgetMax }}</span>
        </p>
      </div>

      <div v-if="lastSearch.results.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <SparklesIcon class="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p class="text-base font-bold text-gray-800 mb-1">No encontramos opciones</p>
        <p class="text-sm text-gray-400">Prueba con otra categoría o un presupuesto mayor.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="srv in lastSearch.results"
          :key="srv.id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div class="p-4">
            <h3 class="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{{ srv.name }}</h3>
            <p v-if="srv.description" class="text-xs text-gray-500 mb-3 line-clamp-2">{{ srv.description }}</p>

            <div class="flex items-center gap-2 mb-3">
              <div class="w-6 h-6 rounded-full overflow-hidden bg-red-100 flex-shrink-0">
                <img v-if="srv.user.avatar" :src="avatarSrc(srv.user.avatar)" :alt="srv.user.firstName" class="w-full h-full object-cover" />
                <span v-else class="w-full h-full flex items-center justify-center text-[10px] font-bold text-workplace-red">
                  {{ srv.user.firstName[0] }}{{ srv.user.lastName[0] }}
                </span>
              </div>
              <span class="text-xs text-gray-500 truncate">{{ srv.user.firstName }} {{ srv.user.lastName }}</span>
              <span v-if="srv.user.rating" class="text-[11px] font-semibold text-amber-600 ml-auto">★ {{ srv.user.rating.toFixed(1) }}</span>
            </div>

            <div class="flex items-center justify-between mb-3">
              <span class="text-lg font-black text-workplace-red">${{ srv.price }}</span>
              <span v-if="srv.priceUnit" class="text-xs text-gray-400">/ {{ srv.priceUnit }}</span>
            </div>

            <button
              class="w-full py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors"
              @click="openConfirm(srv)"
            >
              Solicitar
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Estado inicial -->
    <div v-else class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
      <SparklesIcon class="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p class="text-base font-bold text-gray-800 mb-1">Contanos qué necesitás</p>
      <p class="text-sm text-gray-400">Elegí una categoría y, si querés, un presupuesto máximo.</p>
    </div>

    <ConfirmNeedModal
      v-model="showConfirm"
      :service="selectedService"
      :search-id="lastSearch?.searchId ?? ''"
      @success="onConfirmSuccess"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, onMounted } from 'vue'
import { SparklesIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import ConfirmNeedModal from '~/components/modals/ConfirmNeedModal.vue'
import { useServices, type CatalogService } from '~/composables/services/useServices'
import { useAiNeeds } from '~/composables/ai/useAiNeeds'
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import { useToast } from '~/composables/ui/useToast'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const { categories, loadCategories } = useServices()
const { searching, error, lastSearch, searchNeed } = useAiNeeds()
const { getAssetUrl } = useAssetUrl()
const toast = useToast()

function avatarSrc(avatar: string) { return getAssetUrl(avatar) ?? '' }

const categoryId = ref('')
const budgetMax = ref<number | null>(null)

async function onSearch() {
  if (!categoryId.value) return
  try {
    await searchNeed(categoryId.value, budgetMax.value ?? undefined)
  } catch (e: any) {
    toast.error('No se pudo buscar', getApiErrorMessage(e, 'Intenta de nuevo'))
  }
}

const showConfirm = ref(false)
const selectedService = ref<CatalogService | null>(null)

function openConfirm(srv: CatalogService) {
  selectedService.value = srv
  showConfirm.value = true
}

function onConfirmSuccess() {
  toast.success('Solicitud enviada', 'El proveedor se pondrá en contacto contigo.')
}

onMounted(loadCategories)
</script>
