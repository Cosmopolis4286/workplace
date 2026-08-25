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

    <JobsStatsCards :stats="myJobsStats" />

    <JobsFiltersBar
      :search="search"
      :filter-status="filterStatus"
      @update:search="search = $event"
      @update:filter-status="filterStatus = $event"
    />

    <JobsGrid
      :jobs="filteredJobs"
      :loading="myJobsLoading"
      :search="search"
      :filter-status="filterStatus"
      :status-labels="JOB_STATUS_LABELS"
      :status-classes="JOB_STATUS_CLASSES"
      :type-labels="JOB_TYPE_LABELS"
      :modality-labels="JOB_MODALITY_LABELS"
      :format-salary="formatSalary"
      @create="openCreate"
      @edit="openEdit"
      @delete="confirmDelete"
      @toggle-status="confirmToggleStatus"
    />

    <JobFormModal
      :show="showModal"
      :editing="editing"
      :saving="saving"
      :form-error="formError"
      :form="form"
      :categories="categories"
      :type-labels="JOB_TYPE_LABELS"
      :modality-labels="JOB_MODALITY_LABELS"
      @close="showModal = false"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BriefcaseIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import JobsStatsCards from '~/components/jobs/JobsStatsCards.vue'
import JobsFiltersBar from '~/components/jobs/JobsFiltersBar.vue'
import JobsGrid from '~/components/jobs/JobsGrid.vue'
import JobFormModal, { type JobFormData } from '~/components/jobs/JobFormModal.vue'
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

const emptyForm = (): JobFormData => ({
  title: '',
  description: '',
  salaryMin: undefined,
  salaryMax: undefined,
  salaryCurrency: 'USD',
  location: '',
  type: 'FULL_TIME',
  modality: 'IN_PERSON',
  experienceLevel: '',
  tags: [],
  categoryId: '',
  status: 'ACTIVE',
})

const form = ref<JobFormData>(emptyForm())

const headerStats = computed(() => [
  { label: 'Empleos activos', value: String(myJobsStats.value.activos) },
  { label: 'Total empleos', value: String(myJobsStats.value.total) },
])

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

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  await Promise.all([fetchMyJobs(), loadCategories(), fetchMyJobsStats(), fetchMyKycStatus()])

  const editId = typeof route.query.edit === 'string' ? route.query.edit : null
  if (editId) {
    const target = myJobs.value.find(j => j.id === editId)
    if (target) openEdit(target)
    router.replace({ query: { ...route.query, edit: undefined } })
  }
})
</script>
