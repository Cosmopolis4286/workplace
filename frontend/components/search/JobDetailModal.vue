<template>
  <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
    leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="job" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0">
        <div v-if="job" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="relative aspect-video bg-emerald-50 rounded-t-3xl overflow-hidden">
            <div class="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <svg class="w-16 h-16 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div v-if="job.category" class="absolute top-3 left-3">
              <span class="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow" :style="{ backgroundColor: job.category.color || '#10B981' }">{{ job.category.name }}</span>
            </div>
            <button class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors" @click="$emit('close')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between gap-3 mb-2">
              <h2 class="text-xl font-black text-gray-900 leading-tight">{{ job.title }}</h2>
              <div v-if="job.salaryMin || job.salaryMax" class="text-right flex-shrink-0">
                <div class="text-emerald-600 font-black text-base">
                  <span v-if="job.salaryMin">${{ formatPrice(job.salaryMin) }}</span>
                  <span v-if="job.salaryMin && job.salaryMax"> - </span>
                  <span v-if="job.salaryMax">${{ formatPrice(job.salaryMax) }}</span>
                </div>
                <p v-if="job.salaryCurrency" class="text-xs text-gray-400">{{ job.salaryCurrency }}</p>
              </div>
            </div>
            <p v-if="job.description" class="text-sm text-gray-500 mb-4 leading-relaxed">{{ job.description }}</p>

            <!-- Empleador -->
            <div class="flex items-center gap-2 w-full mb-4">
              <div class="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
                <img v-if="job.employer.avatar" :src="avatarSrc(job.employer.avatar)" :alt="job.employer.firstName" class="w-full h-full object-cover" />
                <span v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-600">
                  {{ job.employer.firstName[0] }}{{ job.employer.lastName[0] }}
                </span>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800">{{ job.employer.firstName }} {{ job.employer.lastName }}</p>
                <p v-if="job.employer.category" class="text-xs text-gray-400">{{ job.employer.subcategory?.name ?? job.employer.category.name }}</p>
              </div>
            </div>

            <!-- Tags de tipo, modalidad, experiencia -->
            <div class="flex flex-wrap gap-1.5 mb-4">
              <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-100">{{ job.type.replace('_', ' ') }}</span>
              <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-100">{{ job.modality }}</span>
              <span v-if="job.experienceLevel" class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-100">{{ job.experienceLevel }}</span>
            </div>

            <!-- Ubicación -->
            <div v-if="job.location" class="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {{ job.location }}
            </div>

            <!-- Tags -->
            <div v-if="job.tags.length" class="flex flex-wrap gap-1.5 mb-4">
              <span v-for="tag in job.tags" :key="tag" class="text-xs px-2.5 py-1 bg-gray-50 text-gray-500 rounded-full font-medium border border-gray-100">{{ tag }}</span>
            </div>

            <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
              <NuxtLink v-if="job.employer.username" :to="`/p/${job.employer.username}`"
                class="flex-shrink-0 text-xs font-semibold text-emerald-600 py-2.5 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors">
                Ver perfil
              </NuxtLink>
              <span v-if="job._count?.applications !== undefined" class="flex-1 text-center text-xs text-gray-400">
                {{ job._count.applications }} aplicaciones
              </span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import type { Job } from '~/composables/jobs/useJobs'

defineProps<{
  job: Job | null
}>()

defineEmits<{
  close: []
}>()

const { getAssetUrl } = useAssetUrl()
function avatarSrc(avatar: string) { return getAssetUrl(avatar) ?? '' }
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}
</script>
