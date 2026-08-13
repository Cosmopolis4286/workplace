<template>
  <div>
    <PageHeader
      title="Mis Empleos"
      description="Gestiona las vacantes que publicas"
      :icon="BriefcaseIcon"
      :breadcrumb="[{ label: 'Empleos' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton
          variant="primary"
          :icon="PlusIcon"
          :disabled="kycStatus !== undefined && kycStatus !== 'APPROVED'"
          @click="openCreate"
        >
          Nuevo Empleo
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="myJobsError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-sm text-red-700">{{ myJobsError }}</p>
      <button @click="myJobsError = null"><XMarkIcon class="h-5 w-5 text-red-400" /></button>
    </div>

    <!-- KYC banner -->
    <div v-if="kycStatus && kycStatus !== 'APPROVED'" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
      Debes verificar tu identidad antes de publicar un empleo.
      <NuxtLink to="/verification" class="font-semibold underline">Completa la verificación</NuxtLink>.
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Total</p>
        <p class="text-2xl font-bold text-gray-900">{{ myJobsStats.total }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Activos</p>
        <p class="text-2xl font-bold text-green-600">{{ myJobsStats.activos }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Pausados</p>
        <p class="text-2xl font-bold text-yellow-600">{{ myJobsStats.pausados }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Cerrados</p>
        <p class="text-2xl font-bold text-gray-400">{{ myJobsStats.cerrados }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Buscar en tus empleos..."
          class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
      </div>
      <select
        v-model="filterStatus"
        class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
      >
        <option value="">Todos los estados</option>
        <option value="ACTIVE">Activos</option>
        <option value="PAUSED">Pausados</option>
        <option value="INACTIVE">Inactivos</option>
        <option value="CLOSED">Cerrados</option>
      </select>
    </div>

    <!-- Loading skeleton -->
    <div v-if="myJobsLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <div v-else-if="filteredJobs.length === 0" class="card p-12 text-center">
      <BriefcaseIcon class="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-1">No hay empleos</h3>
      <p class="text-sm text-gray-500 mb-4">
        {{ search
          ? 'No se encontraron resultados para tu búsqueda.'
          : filterStatus
            ? `No tienes empleos con estado "${JOB_STATUS_LABELS[filterStatus as JobWithApplicationCount['status']]}".`
            : 'Publica tu primera vacante para comenzar.' }}
      </p>
      <button v-if="!search && !filterStatus" @click="openCreate" class="btn-primary">
        <PlusIcon class="h-4 w-4 mr-2" />
        Nuevo Empleo
      </button>
    </div>

    <!-- Jobs grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="job in filteredJobs"
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
            :class="JOB_STATUS_CLASSES[job.status]"
          >
            {{ JOB_STATUS_LABELS[job.status] }}
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
            {{ JOB_TYPE_LABELS[job.type] }}
          </span>
          <span class="text-gray-500 flex items-center gap-1">
            {{ { IN_PERSON: '📍', REMOTE: '💻', HYBRID: '🔀' }[job.modality] }} {{ JOB_MODALITY_LABELS[job.modality] }}
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
            @click="confirmToggleStatus(job)"
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
              @click="openEdit(job)"
              class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            <button
              @click="confirmDelete(job)"
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal crear/editar -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="!saving && (showModal = false)"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-gray-900">
                {{ editing ? 'Editar Empleo' : 'Nuevo Empleo' }}
              </h2>
              <button @click="showModal = false" :disabled="saving" class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <div v-if="formError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ formError }}
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <!-- Título -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-medium text-gray-700">Título <span class="text-red-500">*</span></label>
                  <span class="text-[10px] text-gray-400">{{ form.title.length }}/120</span>
                </div>
                <input
                  v-model="form.title"
                  type="text"
                  placeholder="Ej: Desarrollador Frontend"
                  maxlength="120"
                  required
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>

              <!-- Descripción -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción <span class="text-red-500">*</span></label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  placeholder="Describe la vacante: responsabilidades, requisitos, beneficios..."
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                ></textarea>
              </div>

              <!-- Tipo y modalidad -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                  <select v-model="form.type" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
                    <option v-for="(label, value) in JOB_TYPE_LABELS" :key="value" :value="value">{{ label }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Modalidad</label>
                  <select v-model="form.modality" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
                    <option v-for="(label, value) in JOB_MODALITY_LABELS" :key="value" :value="value">{{ label }}</option>
                  </select>
                </div>
              </div>

              <!-- Salario -->
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Salario mín.</label>
                  <input v-model.number="form.salaryMin" type="number" min="0" placeholder="0" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Salario máx.</label>
                  <input v-model.number="form.salaryMax" type="number" min="0" placeholder="0" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
                  <input v-model="form.salaryCurrency" type="text" placeholder="USD" maxlength="10" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                </div>
              </div>

              <!-- Ubicación y categoría -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Ubicación</label>
                  <input v-model="form.location" type="text" placeholder="Ciudad, país..." class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                  <select v-model="form.categoryId" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
                    <option value="">Sin categoría</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Nivel de experiencia -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nivel de experiencia</label>
                <input v-model="form.experienceLevel" type="text" placeholder="Junior, Mid, Senior..." class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>

              <!-- Tags -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Etiquetas</label>
                <TagsInput v-model="form.tags" suggestions-endpoint="/jobs/catalog/tags" />
                <p class="mt-1.5 text-xs text-gray-400">Ayudan a que tu empleo aparezca en más búsquedas.</p>
              </div>

              <!-- Estado -->
              <div v-if="editing">
                <label class="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <select v-model="form.status" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white">
                  <option value="ACTIVE">Activo</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="INACTIVE">Inactivo</option>
                  <option value="CLOSED">Cerrado</option>
                </select>
              </div>

              <!-- Buttons -->
              <div class="flex gap-3 pt-2">
                <button
                  type="button"
                  @click="showModal = false"
                  :disabled="saving"
                  class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="saving || !isFormValid"
                  class="flex-1 btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {{ saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Publicar empleo') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  BriefcaseIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import TagsInput from '~/components/ui/TagsInput.vue'
import { useJobs, type JobWithApplicationCount, type CreateJobData } from '~/composables/jobs/useJobs'
import { useKyc } from '~/composables/kyc/useKyc'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useFormValidation } from '~/composables/ui/useFormValidation'
import { useDateFormat } from '~/composables/core/useDateFormat'

definePageMeta({ middleware: 'auth' })

const {
  categories,
  myJobs,
  myJobsLoading,
  myJobsError,
  myJobsStats,
  loadCategories,
  fetchMyJobs,
  fetchMyJobsStats,
  createJob,
  updateJob,
  toggleJobStatus,
  deleteJob,
} = useJobs()

const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)
const { confirm } = useConfirm()
const { validate, required } = useFormValidation()
const { formatNumber } = useDateFormat()

const JOB_STATUS_LABELS: Record<JobWithApplicationCount['status'], string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  INACTIVE: 'Inactivo',
  CLOSED: 'Cerrado',
}
const JOB_STATUS_CLASSES: Record<JobWithApplicationCount['status'], string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  CLOSED: 'bg-gray-200 text-gray-500',
}
const JOB_TYPE_LABELS: Record<JobWithApplicationCount['type'], string> = {
  FULL_TIME: 'Tiempo completo',
  PART_TIME: 'Medio tiempo',
  FREELANCE: 'Freelance',
  TEMPORARY: 'Temporal',
  INTERNSHIP: 'Prácticas',
}
const JOB_MODALITY_LABELS: Record<JobWithApplicationCount['modality'], string> = {
  IN_PERSON: 'Presencial',
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
}

const search = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editing = ref<JobWithApplicationCount | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)

const emptyForm = () => ({
  title: '',
  description: '',
  salaryMin: undefined as number | undefined,
  salaryMax: undefined as number | undefined,
  salaryCurrency: 'USD',
  location: '',
  type: 'FULL_TIME' as JobWithApplicationCount['type'],
  modality: 'IN_PERSON' as JobWithApplicationCount['modality'],
  experienceLevel: '',
  tags: [] as string[],
  categoryId: '',
  status: 'ACTIVE' as JobWithApplicationCount['status'],
})

const form = ref(emptyForm())

const headerStats = computed(() => [
  { label: 'Empleos activos', value: String(myJobsStats.value.activos) },
  { label: 'Total empleos', value: String(myJobsStats.value.total) },
])

const isFormValid = computed(() => form.value.title.trim().length > 0 && form.value.description.trim().length > 0)

const filteredJobs = computed(() => {
  let list = myJobs.value
  if (filterStatus.value) list = list.filter(j => j.status === filterStatus.value)
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(j => j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q))
  }
  return list
})

function formatSalary(job: JobWithApplicationCount) {
  const fmt = (n: number) => formatNumber(n)
  if (job.salaryMin && job.salaryMax) return `${fmt(job.salaryMin)} - ${fmt(job.salaryMax)} ${job.salaryCurrency}`
  if (job.salaryMin) return `Desde ${fmt(job.salaryMin)} ${job.salaryCurrency}`
  if (job.salaryMax) return `Hasta ${fmt(job.salaryMax)} ${job.salaryCurrency}`
  return ''
}

function openCreate() {
  editing.value = null
  form.value = emptyForm()
  formError.value = null
  showModal.value = true
}

function openEdit(job: JobWithApplicationCount) {
  editing.value = job
  form.value = {
    title: job.title,
    description: job.description,
    salaryMin: job.salaryMin ?? undefined,
    salaryMax: job.salaryMax ?? undefined,
    salaryCurrency: job.salaryCurrency,
    location: job.location ?? '',
    type: job.type,
    modality: job.modality,
    experienceLevel: job.experienceLevel ?? '',
    tags: [...(job.tags ?? [])],
    categoryId: job.category?.id ?? '',
    status: job.status,
  }
  formError.value = null
  showModal.value = true
}

async function handleSubmit() {
  const titleError = validate(form.value.title, [required('El título')])
  if (titleError) {
    formError.value = titleError
    return
  }
  const descriptionError = validate(form.value.description, [required('La descripción')])
  if (descriptionError) {
    formError.value = descriptionError
    return
  }
  saving.value = true
  formError.value = null
  try {
    const payload: Partial<CreateJobData> & { status?: JobWithApplicationCount['status'] } = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      salaryMin: form.value.salaryMin || undefined,
      salaryMax: form.value.salaryMax || undefined,
      salaryCurrency: form.value.salaryCurrency || 'USD',
      location: form.value.location || undefined,
      type: form.value.type,
      modality: form.value.modality,
      experienceLevel: form.value.experienceLevel || undefined,
      tags: form.value.tags,
      categoryId: form.value.categoryId || undefined,
    }
    if (editing.value) {
      await updateJob(editing.value.id, { ...payload, status: form.value.status })
    } else {
      await createJob(payload as CreateJobData)
    }
    showModal.value = false
  } catch (e: any) {
    formError.value = e?.message ?? 'Error al guardar el empleo'
  } finally {
    saving.value = false
  }
}

async function confirmDelete(job: JobWithApplicationCount) {
  await confirm({
    title: 'Eliminar empleo',
    message: `¿Estás seguro de eliminar ${job.title}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await deleteJob(job.id)
      } catch (e: any) {
        return e?.message ?? 'Error al eliminar'
      }
    },
  })
}

async function confirmToggleStatus(job: JobWithApplicationCount) {
  const willPause = job.status === 'ACTIVE'
  await confirm({
    title: willPause ? 'Pausar empleo' : 'Activar empleo',
    message: `¿Estás seguro de que deseas ${willPause ? 'pausar' : 'activar'} el empleo ${job.title}? ${
      willPause ? 'El empleo dejará de ser visible para los candidatos.' : 'El empleo volverá a ser visible para los candidatos.'
    }`,
    confirmText: willPause ? 'Pausar' : 'Activar',
    onConfirm: async () => {
      try {
        await toggleJobStatus(job)
      } catch (e: any) {
        return e?.message ?? 'Error al cambiar estado'
      }
    },
  })
}

onMounted(async () => {
  await Promise.all([fetchMyJobs(), loadCategories(), fetchMyJobsStats(), fetchMyKycStatus()])
})
</script>
