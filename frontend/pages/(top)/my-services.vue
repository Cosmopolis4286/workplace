<template>
  <div>
    <PageHeader
      title="Mis Servicios"
      description="Gestiona los servicios que ofreces"
      :icon="BriefcaseIcon"
      :breadcrumb="[{ label: 'Servicios' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton :icon="AdjustmentsHorizontalIcon" @click="openModalitiesModal">
          Modalidades
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openCreate">
          Nuevo Servicio
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-sm text-red-700">{{ error }}</p>
      <button @click="error = null"><XMarkIcon class="h-5 w-5 text-red-400" /></button>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Total</p>
        <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Activos</p>
        <p class="text-2xl font-bold text-green-600">{{ stats.activos }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Pausados</p>
        <p class="text-2xl font-bold text-yellow-600">{{ stats.pausados }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 mb-1">Inactivos</p>
        <p class="text-2xl font-bold text-gray-400">{{ stats.inactivos }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="search"
          @input="onSearch"
          type="text"
          placeholder="Buscar servicios..."
          class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
        />
      </div>
      <select
        v-model="filterStatus"
        @change="applyFilter"
        class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
      >
        <option value="">Todos los estados</option>
        <option value="ACTIVE">Activos</option>
        <option value="PAUSED">Pausados</option>
        <option value="INACTIVE">Inactivos</option>
      </select>
    </div>

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
    <div v-else-if="filteredServices.length === 0" class="card p-12 text-center">
      <BriefcaseIcon class="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-1">No hay servicios</h3>
      <p class="text-sm text-gray-500 mb-4">
        {{ search
          ? 'No se encontraron resultados para tu búsqueda.'
          : filterStatus
            ? `No tienes servicios con estado "${SERVICE_STATUS_LABELS[filterStatus as Service['status']]}".`
            : 'Crea tu primer servicio para comenzar.' }}
      </p>
      <button v-if="!search && !filterStatus" @click="openCreate" class="btn-primary">
        <PlusIcon class="h-4 w-4 mr-2" />
        Nuevo Servicio
      </button>
    </div>

    <!-- Services grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ServiceCard
        v-for="service in filteredServices"
        :key="service.id"
        :service="service"
        @toggle-status="confirmToggleStatus"
        @view-metrics="openMetrics"
        @edit="openEdit"
        @delete="confirmDelete"
      />
    </div>

    <ServiceFormModal
      ref="formModalRef"
      :show="showModal"
      :editing="editing"
      :catalog-categories="catalogCategories"
      :saving="saving"
      @close="showModal = false"
      @submit="handleSubmit"
    />

    <ServiceMetricsModal
      :target="metricsTarget"
      :data="metricsData"
      :loading="metricsLoading"
      :error="metricsError"
      @close="closeMetrics"
      @refresh="metricsTarget && openMetrics(metricsTarget)"
    />

    <ServiceModalitiesModal
      :show="showModalitiesModal"
      :modalities="modalities"
      :error="modalityError"
      @close="showModalitiesModal = false"
      @add="addModality"
      @toggle-active="toggleModalityActive"
      @delete="confirmDeleteModality"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  BriefcaseIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import ServiceCard from '~/components/services/ServiceCard.vue'
import ServiceFormModal from '~/components/services/ServiceFormModal.vue'
import ServiceMetricsModal, { type ServiceMetricsData } from '~/components/services/ServiceMetricsModal.vue'
import ServiceModalitiesModal from '~/components/services/ServiceModalitiesModal.vue'
import { useMyServices, SERVICE_STATUS_LABELS, type Service, type ServiceModality } from '~/composables/services/useMyServices'
import { useConfirm } from '~/composables/ui/useConfirm'

definePageMeta({ middleware: 'auth' })

const {
  services,
  catalogCategories,
  modalities,
  loading,
  error,
  stats,
  fetchStats,
  fetchServices,
  fetchCatalogCategories,
  fetchModalities,
  createService,
  updateService,
  toggleStatus: toggleServiceStatus,
  deleteService,
  createModality,
  updateModality,
  deleteModality: deleteModalityFn,
} = useMyServices()

const { confirm } = useConfirm()

const search = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const showModalitiesModal = ref(false)
const editing = ref<Service | null>(null)
const formModalRef = ref<InstanceType<typeof ServiceFormModal> | null>(null)
const metricsTarget = ref<Service | null>(null)
const metricsData = ref<ServiceMetricsData | null>(null)
const metricsLoading = ref(false)
const metricsError = ref<string | null>(null)
const saving = ref(false)
const modalityError = ref<string | null>(null)

const headerStats = computed(() => [
  { label: 'Servicios activos', value: String(stats.value.activos) },
  { label: 'Total servicios', value: String(stats.value.total) },
])

const filteredServices = computed(() => services.value)

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchServices({ search: search.value, status: filterStatus.value }), 350)
}

function applyFilter() {
  fetchServices({ search: search.value, status: filterStatus.value })
}

function openCreate() {
  editing.value = null
  showModal.value = true
}

function openEdit(service: Service) {
  editing.value = service
  showModal.value = true
}

async function handleSubmit(payload: Record<string, unknown>) {
  saving.value = true
  try {
    if (editing.value) {
      await updateService(editing.value.id, payload)
    } else {
      await createService(payload)
    }
    showModal.value = false
  } catch (e: any) {
    formModalRef.value?.setError(e?.message ?? 'Error al guardar el servicio')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(service: Service) {
  await confirm({
    title: 'Eliminar servicio',
    message: `¿Estás seguro de eliminar ${service.name}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await deleteService(service.id)
      } catch (e: any) {
        return e?.message ?? 'Error al eliminar'
      }
    },
  })
}

async function confirmToggleStatus(service: Service) {
  const willPause = service.status === 'ACTIVE'
  await confirm({
    title: willPause ? 'Pausar servicio' : 'Activar servicio',
    message: `¿Estás seguro de que deseas ${willPause ? 'pausar' : 'activar'} el servicio ${service.name}? ${
      willPause ? 'El servicio dejará de ser visible para los clientes.' : 'El servicio volverá a ser visible para los clientes.'
    }`,
    confirmText: willPause ? 'Pausar' : 'Activar',
    onConfirm: async () => {
      try {
        await toggleServiceStatus(service.id)
      } catch (e: any) {
        return e?.message ?? 'Error al cambiar estado'
      }
    },
  })
}

// Descarta respuestas de métricas que llegan tarde para un servicio que ya no
// es el que está abierto (ej. el usuario cierra y abre otro modal rápido).
let metricsRequestId = 0

async function openMetrics(service: Service) {
  const requestId = ++metricsRequestId
  const isRefresh = metricsTarget.value?.id === service.id && metricsData.value !== null
  metricsTarget.value = service
  metricsError.value = null
  // En un refresh mantenemos los datos previos visibles en vez de taparlos con
  // el skeleton — el ícono de recarga ya indica que hay una petición en curso.
  if (!isRefresh) metricsData.value = null
  metricsLoading.value = true
  const { get } = useApi()
  try {
    const data = await get<ServiceMetricsData>(`/services/${service.id}/metrics`)
    if (requestId !== metricsRequestId) return
    metricsData.value = data
  } catch (e: any) {
    if (requestId !== metricsRequestId) return
    metricsError.value = e?.message ?? 'No se pudieron cargar las métricas'
  } finally {
    if (requestId === metricsRequestId) metricsLoading.value = false
  }
}

function closeMetrics() {
  metricsRequestId++
  metricsTarget.value = null
  metricsData.value = null
  metricsError.value = null
}

function openModalitiesModal() {
  showModalitiesModal.value = true
  modalityError.value = null
  fetchModalities()
}

async function addModality(payload: { name: string; value: string; emoji: string }) {
  modalityError.value = null
  try {
    await createModality({
      name: payload.name,
      value: payload.value,
      emoji: payload.emoji,
      sortOrder: modalities.value.length,
    })
  } catch (e: any) {
    modalityError.value = e?.message ?? 'Error al crear modalidad'
  }
}

async function toggleModalityActive(modality: ServiceModality) {
  modalityError.value = null
  try {
    await updateModality(modality.id, { isActive: !modality.isActive })
  } catch (e: any) {
    modalityError.value = e?.message ?? 'Error al actualizar modalidad'
  }
}

async function confirmDeleteModality(modality: ServiceModality) {
  await confirm({
    title: 'Eliminar modalidad',
    message: `¿Estás seguro de eliminar ${modality.name}? Los servicios que la tengan activada dejarán de mostrarla.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await deleteModalityFn(modality.id)
      } catch (e: any) {
        return e?.message ?? 'Error al eliminar modalidad'
      }
    },
  })
}

onMounted(async () => {
  await Promise.all([fetchServices(), fetchCatalogCategories(), fetchStats()])
})
</script>
