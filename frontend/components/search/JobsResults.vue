<template>
  <div class="flex-1 min-w-0">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-4 gap-3">
      <div>
        <p class="text-sm font-bold text-gray-800">
          <span v-if="loading">Buscando...</span>
          <span v-else><span class="text-emerald-600">{{ total }}</span> {{ total === 1 ? ' empleo disponible' : ' empleos disponibles' }}</span>
        </p>
        <p v-if="activeCategoryId || activeType || activeModality" class="text-xs text-gray-400 mt-0.5">
          <span v-if="activeCategoryId">Categoría: <strong>{{ categories.find(c => c.id === activeCategoryId)?.name }}</strong></span>
          <span v-if="activeType"> · Tipo: <strong>{{ activeType }}</strong></span>
          <span v-if="activeModality"> · Modalidad: <strong>{{ activeModality }}</strong></span>
        </p>
      </div>
      <div class="flex items-center gap-2 lg:hidden flex-shrink-0">
        <button
          class="flex items-center gap-1.5 text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 whitespace-nowrap"
          @click="$emit('open-filters')"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M6 8h12M9 12h6M11 16h2"/>
          </svg>
          Filtros
        </button>
        <select :value="selectedSort" class="text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none" @change="$emit('apply-sort', ($event.target as HTMLSelectElement).value)">
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </div>

    <TagChips endpoint="/jobs/catalog/tags" :model-value="activeTag" accent="emerald" @update:model-value="$emit('tag-click', $event)" />

    <div v-if="locationTierLabel" class="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-4">
      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      {{ locationTierLabel }}
    </div>

    <RecentlyViewedStrip :items="recentlyViewedItems" accent="emerald" @open="$emit('open-recently-viewed', $event)" />

    <!-- Error -->
    <div v-if="error" class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
      <p class="text-sm font-semibold text-emerald-700 mb-3">{{ error }}</p>
      <button class="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl" @click="$emit('retry')">Reintentar</button>
    </div>

    <!-- Skeleton -->
    <div v-else-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        <div class="p-4 space-y-3">
          <div class="h-5 bg-gray-200 rounded w-3/4" />
          <div class="h-3 bg-gray-200 rounded w-full" />
          <div class="h-3 bg-gray-200 rounded w-2/3" />
          <div class="flex items-center gap-2 mt-3">
            <div class="h-8 w-8 bg-gray-200 rounded-full" />
            <div class="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
    </div>

    <!-- Vacío -->
    <div v-else-if="jobs.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
      <div class="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      </div>
      <p class="text-base font-bold text-gray-800 mb-1">Sin empleos disponibles</p>
      <p class="text-sm text-gray-400 mb-6">{{ searchInput ? `No hay empleos para "${searchInput}"` : 'No hay empleos con estos filtros' }}</p>
      <button class="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors" @click="$emit('reset-filters')">Ver todos los empleos</button>
    </div>

    <!-- Grid empleos -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="job in jobs"
        :key="job.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        @click="$emit('view-job', job)"
      >
        <div class="p-4">
          <!-- Categoría -->
          <div v-if="job.category" class="mb-3">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" :style="{ backgroundColor: job.category.color || '#10B981' }">
              {{ job.category.name }}
            </span>
          </div>

          <!-- Título y descripción -->
          <h3 class="font-bold text-gray-900 text-sm mb-2 line-clamp-1">{{ job.title }}</h3>
          <p class="text-xs text-gray-500 mb-3 line-clamp-2">{{ job.description }}</p>

          <!-- Empleador -->
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
              <img v-if="job.employer.avatar" :src="avatarSrc(job.employer.avatar)" :alt="job.employer.firstName" class="w-full h-full object-cover" />
              <span v-else class="w-full h-full flex items-center justify-center text-[10px] font-bold text-emerald-600">
                {{ job.employer.firstName[0] }}{{ job.employer.lastName[0] }}
              </span>
            </div>
            <span class="text-xs text-gray-500 truncate">{{ job.employer.firstName }} {{ job.employer.lastName }}</span>
          </div>

          <!-- Tags de tipo y modalidad -->
          <div class="flex flex-wrap gap-1 mb-3">
            <span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{{ job.type.replace('_', ' ') }}</span>
            <span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{{ job.modality }}</span>
            <span v-if="job.experienceLevel" class="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">{{ job.experienceLevel }}</span>
          </div>

          <!-- Ubicación -->
          <div v-if="job.location" class="flex items-center gap-1 text-xs text-gray-400 mb-3">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {{ job.location }}
          </div>

          <!-- Salario -->
          <div v-if="job.salaryMin || job.salaryMax" class="flex items-center justify-between pt-3 border-t border-gray-100">
            <div class="text-emerald-600 font-black text-sm">
              <span v-if="job.salaryMin">${{ formatPrice(job.salaryMin) }}</span>
              <span v-if="job.salaryMin && job.salaryMax"> - </span>
              <span v-if="job.salaryMax">${{ formatPrice(job.salaryMax) }}</span>
              <span v-if="job.salaryCurrency" class="text-xs font-normal text-gray-400 ml-0.5">{{ job.salaryCurrency }}</span>
            </div>
            <div v-if="job._count?.applications !== undefined" class="text-xs text-gray-400">
              {{ job._count.applications }} aplicaciones
            </div>
          </div>

          <OwnerActionsBar
            v-if="isOwnJob(job)"
            :is-active="job.status === 'ACTIVE'"
            :can-toggle="job.status !== 'CLOSED'"
            @toggle-status="$emit('toggle-job-status', job)"
            @edit="$emit('edit-job', job)"
            @delete="$emit('delete-job', job)"
          />
        </div>
      </div>
    </div>

    <SearchPagination :current-page="currentPage" :total-pages="totalPages" accent="emerald" @change-page="$emit('change-page', $event)" />
  </div>
</template>

<script setup lang="ts">
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import TagChips from '~/components/search/TagChips.vue'
import RecentlyViewedStrip from '~/components/search/RecentlyViewedStrip.vue'
import SearchPagination from '~/components/search/SearchPagination.vue'
import OwnerActionsBar from '~/components/search/OwnerActionsBar.vue'
import type { Job, JobCategory, JobSortBy } from '~/composables/jobs/useJobs'
import type { RecentlyViewedItem } from '~/composables/search/useRecentlyViewed'

defineProps<{
  loading: boolean
  error: string | null
  total: number
  totalPages: number
  currentPage: number
  activeCategoryId: string | null
  activeType: string | null
  activeModality: string | null
  categories: JobCategory[]
  selectedSort: JobSortBy
  sortOptions: { value: JobSortBy; label: string }[]
  activeTag: string
  locationTierLabel: string | null
  recentlyViewedItems: RecentlyViewedItem[]
  jobs: Job[]
  searchInput: string
  isOwnJob: (job: Job) => boolean
}>()

defineEmits<{
  'apply-sort': [value: string]
  'reset-filters': []
  'tag-click': [tag: string]
  'open-recently-viewed': [item: RecentlyViewedItem]
  retry: []
  'view-job': [job: Job]
  'change-page': [page: number]
  'toggle-job-status': [job: Job]
  'edit-job': [job: Job]
  'delete-job': [job: Job]
  'open-filters': []
}>()

const { getAssetUrl } = useAssetUrl()
function avatarSrc(avatar: string) { return getAssetUrl(avatar) ?? '' }
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}
</script>
