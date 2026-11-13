<template>
  <div>
    <!-- Pull-to-refresh indicator (mobile) -->
    <div
      v-if="isPulling || isRefreshing"
      class="flex items-center justify-center overflow-hidden transition-all"
      :style="{ height: `${isRefreshing ? 40 : pullDistance}px` }"
    >
      <ArrowPathIcon class="h-5 w-5 text-red-500" :class="{ 'animate-spin': isRefreshing }" />
    </div>

    <PageHeader
      title="Gestión de Delivery"
      description="Control de entregas y repartidores"
      :icon="TruckIcon"
      :breadcrumb="[{ label: 'Delivery' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton :icon="ArrowPathIcon" :loading="loading" :disabled="loading" @click="refreshAll">
          Actualizar
        </HeaderActionButton>
        <HeaderActionButton :icon="UserPlusIcon" @click="openInviteDriver">
          Invitar repartidor
        </HeaderActionButton>
        <HeaderActionButton
          variant="primary"
          :icon="PlusIcon"
          :disabled="kycStatus !== undefined && kycStatus !== 'APPROVED'"
          @click="openNewDelivery"
        >
          Nueva Entrega
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- KYC banner -->
    <div v-if="kycStatus && kycStatus !== 'APPROVED'" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
      Debes verificar tu identidad antes de crear una entrega.
      <NuxtLink to="/verification" class="font-semibold underline">Completa la verificación</NuxtLink>.
    </div>

    <DeliveryListSection
      :deliveries="filteredDeliveries"
      :loading="loading"
      :status-filter="statusFilter"
      :changing-status-id="changingStatusId"
      :total-count="totalCount"
      :page-size="pageSize"
      :current-page="currentPage"
      @update:status-filter="statusFilter = $event"
      @new="openNewDelivery"
      @assign="openAssign"
      @edit="openEditDelivery"
      @delete="confirmDeleteDelivery"
      @change-status="changeStatus"
      @page="goPage"
    />

    <DriversSection
      :drivers="drivers"
      :loading="loadingDrivers"
      :pending-invitations="pendingInvitations"
      @invite="openInviteDriver"
      @cancel-invitation="handleCancelInvitation"
      @edit="openEditDriver"
      @delete="confirmDeleteDriver"
    />

    <DeliveryFormModal
      :show="showDeliveryModal"
      :editing="!!editingDelivery"
      :saving="savingDelivery"
      :drivers="drivers"
      :form="deliveryForm"
      @close="closeDeliveryModal"
      @submit="saveDelivery"
    />

    <DriverFormModal
      :show="showDriverModal"
      :saving="savingDriver"
      :form="driverForm"
      @close="closeDriverModal"
      @submit="saveDriver"
    />

    <InviteDriverModal
      :show="showInviteModal"
      :sending="sendingInvite"
      :error="inviteError"
      :form="inviteForm"
      @close="closeInviteModal"
      @submit="sendInvite"
    />

    <AssignDriverModal
      :show="showAssignModal"
      :delivery="assigningDelivery"
      :drivers="drivers"
      @close="showAssignModal = false"
      @assign="doAssign"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TruckIcon, PlusIcon, UserPlusIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import DeliveryListSection from '~/components/delivery/DeliveryListSection.vue'
import DriversSection from '~/components/delivery/DriversSection.vue'
import DeliveryFormModal from '~/components/delivery/DeliveryFormModal.vue'
import DriverFormModal from '~/components/delivery/DriverFormModal.vue'
import InviteDriverModal from '~/components/delivery/InviteDriverModal.vue'
import AssignDriverModal from '~/components/delivery/AssignDriverModal.vue'
import {
  useDelivery,
  type Delivery, type Driver, type CreateDeliveryPayload, type CreateDriverPayload,
  type DeliveryStatus, type InviteDriverPayload,
} from '~/composables/delivery/useDelivery'
import { useKyc } from '~/composables/kyc/useKyc'
import { useConfirm } from '~/composables/ui/useConfirm'

definePageMeta({ middleware: 'auth' })

const { confirm } = useConfirm()
const {
  deliveries, drivers, stats, loading, loadingDrivers, error, totalCount,
  invitations,
  loadDeliveries, loadDrivers,
  createDelivery, updateDelivery, deleteDelivery, updateDeliveryStatus, assignDriver,
  updateDriver, deleteDriver,
  loadInvitations, inviteDriver, cancelInvitation,
} = useDelivery()

const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)

const statusFilter = ref<string>('')
const currentPage  = ref(1)
const pageSize     = 18

const filteredDeliveries = computed(() =>
  statusFilter.value ? deliveries.value.filter(d => d.status === statusFilter.value) : deliveries.value
)

const headerStats = computed(() => [
  { label: 'Activas',          value: String(stats.value.activeDeliveries)  },
  { label: 'Repartidores',     value: String(stats.value.onlineDrivers)     },
  { label: 'Entregados hoy',   value: String(stats.value.deliveredToday)    },
  { label: 'Total hoy',        value: String(stats.value.todayDeliveries)   },
])

async function goPage(page: number) {
  currentPage.value = page
  await loadDeliveries({ status: statusFilter.value as DeliveryStatus || undefined, page, limit: pageSize })
}

async function refreshAll() {
  await Promise.all([
    loadDeliveries({ status: statusFilter.value as DeliveryStatus || undefined, page: currentPage.value, limit: pageSize }),
    loadDrivers(),
  ])
}

const { isRefreshing, pullDistance, isPulling } = usePullToRefresh(refreshAll)

const changingStatusId = ref<string | null>(null)
async function changeStatus(id: string, status: DeliveryStatus) {
  if (changingStatusId.value) return
  changingStatusId.value = id
  try {
    await updateDeliveryStatus(id, status)
  } finally {
    changingStatusId.value = null
  }
}

// ── Delivery Modal ────────────────────────────────────────────────────────────
const showDeliveryModal = ref(false)
const editingDelivery   = ref<Delivery | null>(null)
const savingDelivery    = ref(false)

const defaultDeliveryForm = (): CreateDeliveryPayload => ({
  orderNumber: '', customerName: '', customerPhone: '', deliveryAddress: '',
  notes: '', total: 0, deliveryFee: 0, estimatedTime: undefined, driverId: '',
  customerUserId: '', customerEmail: '', pickupLat: undefined, pickupLng: undefined, destLat: undefined, destLng: undefined,
})
const deliveryForm = ref<CreateDeliveryPayload>(defaultDeliveryForm())

function openNewDelivery() { editingDelivery.value = null; deliveryForm.value = defaultDeliveryForm(); showDeliveryModal.value = true }
function openEditDelivery(d: Delivery) {
  editingDelivery.value = d
  deliveryForm.value = {
    orderNumber: d.orderNumber, customerName: d.customerName, customerPhone: d.customerPhone ?? '', deliveryAddress: d.deliveryAddress,
    notes: d.notes ?? '', total: d.total, deliveryFee: d.deliveryFee, estimatedTime: d.estimatedTime, driverId: d.driverId ?? '',
    customerUserId: d.customerUserId ?? '', pickupLat: d.pickupLat ?? undefined, pickupLng: d.pickupLng ?? undefined,
    destLat: d.destLat ?? undefined, destLng: d.destLng ?? undefined,
  }
  showDeliveryModal.value = true
}
function closeDeliveryModal() { showDeliveryModal.value = false; editingDelivery.value = null }
async function saveDelivery() {
  savingDelivery.value = true
  try {
    // Tracking en vivo requiere las 4 coordenadas juntas o ninguna — mandar
    // solo pickup o solo destino no sirve para calcular ruta/ETA.
    const hasFullRoute = deliveryForm.value.pickupLat != null && deliveryForm.value.pickupLng != null
      && deliveryForm.value.destLat != null && deliveryForm.value.destLng != null
    const payload = {
      ...deliveryForm.value,
      driverId: deliveryForm.value.driverId || undefined,
      customerUserId: deliveryForm.value.customerUserId || undefined,
      // Vacío no se manda: el backend valida que sea un correo.
      customerEmail: deliveryForm.value.customerEmail?.trim() || undefined,
      pickupLat: hasFullRoute ? deliveryForm.value.pickupLat : undefined,
      pickupLng: hasFullRoute ? deliveryForm.value.pickupLng : undefined,
      destLat: hasFullRoute ? deliveryForm.value.destLat : undefined,
      destLng: hasFullRoute ? deliveryForm.value.destLng : undefined,
    }
    if (editingDelivery.value) await updateDelivery(editingDelivery.value.id, payload)
    else await createDelivery(payload)
    closeDeliveryModal()
  } finally { savingDelivery.value = false }
}
async function confirmDeleteDelivery(id: string) {
  const ok = await confirm({ title: 'Eliminar entrega', message: '¿Eliminar esta entrega?', confirmText: 'Eliminar', variant: 'danger' })
  if (ok) await deleteDelivery(id)
}

// ── Assign Modal ──────────────────────────────────────────────────────────────
const showAssignModal    = ref(false)
const assigningDelivery  = ref<Delivery | null>(null)

function openAssign(delivery: Delivery) { assigningDelivery.value = delivery; showAssignModal.value = true }
async function doAssign(driverId: string) {
  if (!assigningDelivery.value) return
  await assignDriver(assigningDelivery.value.id, driverId)
  showAssignModal.value = false; assigningDelivery.value = null
}

// ── Driver Modal ──────────────────────────────────────────────────────────────
const showDriverModal = ref(false)
const editingDriver   = ref<Driver | null>(null)
const savingDriver    = ref(false)

const defaultDriverForm = (): CreateDriverPayload => ({ name: '', phone: '', vehicleType: 'MOTORCYCLE', vehicleModel: '', vehiclePlate: '' })
const driverForm = ref<CreateDriverPayload>(defaultDriverForm())

function openEditDriver(d: Driver) {
  editingDriver.value = d
  driverForm.value = { name: d.name, phone: d.phone ?? '', vehicleType: d.vehicleType, vehicleModel: d.vehicleModel ?? '', vehiclePlate: d.vehiclePlate ?? '' }
  showDriverModal.value = true
}
function closeDriverModal() { showDriverModal.value = false; editingDriver.value = null }
async function saveDriver() {
  if (!editingDriver.value) return
  savingDriver.value = true
  try {
    await updateDriver(editingDriver.value.id, driverForm.value)
    closeDriverModal()
  } finally { savingDriver.value = false }
}
async function confirmDeleteDriver(id: string) {
  const ok = await confirm({ title: 'Desactivar repartidor', message: '¿Desactivar este repartidor?', confirmText: 'Desactivar', variant: 'danger' })
  if (ok) await deleteDriver(id)
}

// ── Invite Modal ──────────────────────────────────────────────────────────────
const showInviteModal = ref(false)
const sendingInvite    = ref(false)
const inviteError      = ref<string | null>(null)
const inviteForm = ref<InviteDriverPayload>({ email: '', name: '', phone: '' })
const pendingInvitations = computed(() => invitations.value.filter((i) => i.status === 'PENDING'))

function openInviteDriver() {
  inviteForm.value = { email: '', name: '', phone: '' }
  inviteError.value = null
  showInviteModal.value = true
}
function closeInviteModal() { showInviteModal.value = false }
async function sendInvite() {
  sendingInvite.value = true
  inviteError.value = null
  try {
    const payload = {
      email: inviteForm.value.email,
      name: inviteForm.value.name || undefined,
      phone: inviteForm.value.phone || undefined,
    }
    const result = await inviteDriver(payload)
    if (result) closeInviteModal()
    else inviteError.value = error.value
  } finally { sendingInvite.value = false }
}
async function handleCancelInvitation(id: string) {
  const ok = await confirm({ title: 'Cancelar invitación', message: '¿Cancelar esta invitación?', confirmText: 'Sí, cancelar', cancelText: 'No', variant: 'danger' })
  if (ok) await cancelInvitation(id)
}

onMounted(async () => {
  await Promise.all([loadDeliveries({ limit: pageSize }), loadDrivers(), loadInvitations(), fetchMyKycStatus()])
})
</script>
