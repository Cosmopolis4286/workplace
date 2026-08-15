<template>
  <div>
    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="card p-5 animate-pulse space-y-3">
        <div class="h-5 bg-gray-200 rounded w-3/4"></div>
        <div class="h-3 bg-gray-100 rounded w-full"></div>
        <div class="h-3 bg-gray-100 rounded w-2/3"></div>
        <div class="flex justify-between mt-2">
          <div class="h-6 bg-gray-200 rounded w-20"></div>
          <div class="h-6 bg-gray-100 rounded w-16"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="jobs.length === 0" class="card p-12 text-center">
      <BriefcaseIcon class="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-1">No hay empleos</h3>
      <p class="text-sm text-gray-500 mb-4">
        {{ search
          ? 'No se encontraron resultados para tu búsqueda.'
          : filterStatus
            ? `No tienes empleos con estado "${statusLabels[filterStatus as JobWithApplicationCount['status']]}".`
            : 'Publica tu primera vacante para comenzar.' }}
      </p>
      <button v-if="!search && !filterStatus" @click="$emit('create')" class="btn-primary">
        <PlusIcon class="h-4 w-4 mr-2" />
        Nuevo Empleo
      </button>
    </div>

    <!-- Jobs grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="job in jobs"
        :key="job.id"
        class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 truncate">{{ job.title }}</h3>
            <p v-if="job.category" class="text-xs text-gray-500 mt-0.5">
              <span
                class="inline-block w-2 h-2 rounded-full mr-1"
                :style="{ backgroundColor: job.category.color }"
              ></span>
              {{ job.category.name }}
            </p>
          </div>
          <span
            class="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full"
            :class="statusClasses[job.status]"
          >
            {{ statusLabels[job.status] }}
          </span>
        </div>

        <!-- Description -->
        <p v-if="job.description" class="text-sm text-gray-600 line-clamp-2">
          {{ job.description }}
        </p>

        <!-- Meta -->
        <div class="flex items-center gap-3 text-sm flex-wrap">
          <span v-if="job.salaryMin || job.salaryMax" class="font-bold text-gray-900">
            {{ formatSalary(job) }}
          </span>
          <span class="text-gray-500 flex items-center gap-1">
            <BriefcaseIcon class="h-3.5 w-3.5" />
            {{ typeLabels[job.type] }}
          </span>
          <span class="text-gray-500 flex items-center gap-1">
            {{ { IN_PERSON: '📍', REMOTE: '💻', HYBRID: '🔀' }[job.modality] }} {{ modalityLabels[job.modality] }}
          </span>
        </div>

        <!-- Tags -->
        <div v-if="job.tags?.length" class="flex flex-wrap gap-1">
          <span
            v-for="tag in job.tags.slice(0, 4)"
            :key="tag"
            class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
          >
            {{ tag }}
          </span>
          <span v-if="job.tags.length > 4" class="text-xs text-gray-400">+{{ job.tags.length - 4 }}</span>
        </div>

        <!-- Postulantes -->
        <p class="text-xs text-gray-500 flex items-center gap-1">
          <UserGroupIcon class="h-3.5 w-3.5" />
          {{ job._count.applications }} postulante{{ job._count.applications !== 1 ? 's' : '' }}
        </p>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            v-if="job.status !== 'CLOSED'"
            @click="$emit('toggle-status', job)"
            class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            :class="job.status === 'ACTIVE'
              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'"
          >
            {{ job.status === 'ACTIVE' ? 'Pausar' : 'Activar' }}
          </button>
          <span v-else />
          <div class="flex gap-1">
            <button
              @click="$emit('edit', job)"
              class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            <button
              @click="$emit('delete', job)"
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BriefcaseIcon, PlusIcon, PencilIcon, TrashIcon, UserGroupIcon } from '@heroicons/vue/24/outline'
import type { JobWithApplicationCount } from '~/composables/jobs/useJobs'

defineProps<{
  jobs: JobWithApplicationCount[]
  loading: boolean
  search: string
  filterStatus: string
  statusLabels: Record<JobWithApplicationCount['status'], string>
  statusClasses: Record<JobWithApplicationCount['status'], string>
  typeLabels: Record<JobWithApplicationCount['type'], string>
  modalityLabels: Record<JobWithApplicationCount['modality'], string>
  formatSalary: (job: JobWithApplicationCount) => string
}>()

defineEmits<{
  create: []
  edit: [job: JobWithApplicationCount]
  delete: [job: JobWithApplicationCount]
  'toggle-status': [job: JobWithApplicationCount]
}>()
</script>
