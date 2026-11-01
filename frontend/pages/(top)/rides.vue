<template>
  <div>
    <PageHeader
      title="Corridas y Fletes"
      :description="subtitleText"
      :icon="TruckIcon"
      :breadcrumb="[{ label: 'Corridas y Fletes' }]"
      :stats="headerStats"
    >
      <template #actions>
        <div class="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
          <button
            v-if="canRequestCorrida"
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === 'request' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = 'request'"
          >Solicitar Viaje/Flete</button>
          <button
            v-if="canViewAvailableCorridas"
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === 'available' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = 'available'"
          >Disponibles</button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === 'history' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = 'history'"
          >{{ canManageCorridas ? 'Mis Asignaciones' : 'Mis Viajes' }}</button>
        </div>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="clearError">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- KYC banner -->
    <div
      v-if="activeTab === 'request' && kycStatus && kycStatus !== 'APPROVED'"
      class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700"
    >
      Debes verificar tu identidad antes de pedir una corrida.
      <NuxtLink to="/verification" class="font-semibold underline">Completa la verificación</NuxtLink>.
    </div>

    <!-- TAB: Solicitar Viaje -->
    <div v-if="activeTab === 'request' && canRequestCorrida" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <RideRequestForm
          v-model:service-type="serviceType"
          v-model:vehicle-type="vehicleType"
          v-model:origin-place="originPlace"
          v-model:destination-place="destinationPlace"
          v-model:recipient-name="recipientName"
          v-model:recipient-phone="recipientPhone"
          v-model:cargo-description="cargoDescription"
          v-model:cargo-weight="cargoWeight"
          v-model:declared-value="declaredValue"
          v-model:notes="notes"
          :price-estimate="priceEstimate"
          :calculating-price="calculatingPrice"
          :loading="loading"
          :can-submit="canSubmit"
          @origin-selected="onOriginSelected"
          @destination-selected="onDestinationSelected"
          @submit="handleSubmitRequest"
          @recalculate="recalculatePrice"
        />
      </div>

      <div class="space-y-4">
        <ActiveRideSidebar
          :ride="hasActiveCorrida ? activeCorrida : null"
          :elapsed-time="elapsedTime"
          :cancelling="cancelling"
          @cancel="corridaToCancelId = $event; showCancelModal = true"
        />
      </div>
    </div>

    <!-- TAB: Corridas Disponibles (conductor) -->
    <DriverProfileCard
      v-if="activeTab === 'available' && canViewAvailableCorridas"
      class="mb-4"
      @status="driverStatus = $event"
    />
    <AvailableRidesTab
      v-if="activeTab === 'available' && canViewAvailableCorridas && driverStatus === 'APPROVED'"
      :rides="availableCorridas"
      :loading="loading"
      :accepting-id="acceptingId"
      @refresh="refreshAvailable"
      @accept="handleAccept"
    />

    <!-- TAB: Historial / Mis Asignaciones -->
    <RideHistoryTab
      v-if="activeTab === 'history'"
      :rides="historyList"
      :loading="loading"
      :is-driver="canManageCorridas"
      :subtitle="historySubtitle"
      :updating-id="updatingId"
      @refresh="refreshHistory"
      @cancel="corridaToCancelId = $event; showCancelModal = true"
      @update-status="handleUpdateStatus"
      @driver-cancel="openDriverCancel"
    />

    <!-- Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="toast.visible"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium"
          :class="{
            'bg-green-600': toast.type === 'success',
            'bg-red-600':   toast.type === 'error',
            'bg-amber-500': toast.type === 'warning',
            'bg-blue-600':  toast.type === 'info',
          }"
        >{{ toast.message }}</div>
      </Transition>
    </Teleport>

    <CancelRideModal
      :show="showCancelModal"
      :elapsed-time="elapsedTime"
      :cancelling="cancelling"
      :needs-reason="cancelTargetStatus === 'ACCEPTED'"
      @close="showCancelModal = false"
      @confirm="handleCancel(corridaToCancelId!, $event)"
    />

    <!-- Conductor: soltar una corrida aceptada o cancelarla (pasajero no apareció) -->
    <Teleport to="body">
      <div v-if="driverCancelId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="driverCancelId = null" />
        <form class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-3" @submit.prevent="submitDriverCancel">
          <h3 class="font-semibold text-gray-900">Soltar la corrida</h3>
          <label class="flex items-start gap-2 text-sm">
            <input v-model="driverCancelNoShow" type="checkbox" class="mt-0.5" />
            <span>El pasajero no apareció (la corrida se cancela). Si no, vuelve a estar disponible para otro conductor.</span>
          </label>
          <textarea v-model="driverCancelReason" rows="2" maxlength="300" class="input-field resize-none" placeholder="Ej. Esperé 15 minutos y no contesta" />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary text-sm" @click="driverCancelId = null">Volver</button>
            <button type="submit" class="btn-primary text-sm" :disabled="updatingId === driverCancelId || driverCancelReason.trim().length < 5">Confirmar</button>
          </div>
        </form>
      </div>
    </Teleport>

    <!-- Conductor: código de entrega al completar un envío -->
    <Teleport to="body">
      <div v-if="codeRideId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="codeRideId = null" />
        <form class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-3" @submit.prevent="submitDeliveryCode">
          <h3 class="font-semibold text-gray-900">Código de entrega</h3>
          <p class="text-sm text-gray-500">Pídele a quien recibe el envío su código de 4 dígitos.</p>
          <input v-model="deliveryCodeInput" inputmode="numeric" maxlength="4" class="input-field font-mono text-center text-2xl tracking-[0.4em]" placeholder="0000" />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary text-sm" @click="codeRideId = null">Volver</button>
            <button type="submit" class="btn-primary text-sm" :disabled="updatingId === codeRideId || !/^\d{4}$/.test(deliveryCodeInput)">Completar envío</button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import { TruckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import RideRequestForm from '~/components/rides/RideRequestForm.vue'
import ActiveRideSidebar from '~/components/rides/ActiveRideSidebar.vue'
import AvailableRidesTab from '~/components/rides/AvailableRidesTab.vue'
import RideHistoryTab from '~/components/rides/RideHistoryTab.vue'
import CancelRideModal from '~/components/rides/CancelRideModal.vue'
import DriverProfileCard from '~/components/rides/DriverProfileCard.vue'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import type { PlaceSuggestion } from '~/composables/location/useNominatim'
import type { Ride } from '~/composables/delivery/useRides'
import { useKyc } from '~/composables/kyc/useKyc'
import { useRideHelpers } from '~/composables/delivery/useRideHelpers'

definePageMeta({ middleware: 'auth' })

const {
  corridas, myCorridas, activeCorrida, loading, error,
  hasActiveCorrida, canRequestCorrida, canManageCorridas,
  fetchAvailableCorridas, fetchMyCorridas, fetchDriverCorridas,
  createCorrida, acceptCorrida, updateCorridaStatus, cancelCorrida, driverCancelCorrida,
  calculatePrice, clearError,
} = useRides()

const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)

const { reloadPermissions, userCategory, userSubcategory } = usePermissions()
const { formatPrice } = useRideHelpers()

// ─── Estado local ─────────────────────────────────────────────────────────────
const activeTab        = ref('request')
const calculatingPrice = ref(false)
const priceEstimate    = ref<{ price: number; distance: number; duration: number } | null>(null)
const cancelling       = ref(false)
const acceptingId      = ref<string | null>(null)
const updatingId       = ref<string | null>(null)
const showCancelModal  = ref(false)
const corridaToCancelId = ref<string | null>(null)

const toast = reactive({ visible: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
let toastTimer: ReturnType<typeof setTimeout>
function showToast(type: typeof toast.type, message: string) {
  clearTimeout(toastTimer)
  toast.type = type; toast.message = message; toast.visible = true
  toastTimer = setTimeout(() => { toast.visible = false }, 3500)
}

const elapsedTime = ref('0:00')
let elapsedTimer: ReturnType<typeof setInterval> | null = null

function startElapsedTimer() {
  stopElapsedTimer()
  if (!activeCorrida.value) return
  const from = new Date(activeCorrida.value.createdAt).getTime()
  elapsedTimer = setInterval(() => {
    const secs = Math.floor((Date.now() - from) / 1000)
    const m = Math.floor(secs / 60); const s = secs % 60
    elapsedTime.value = `${m}:${s.toString().padStart(2, '0')}`
  }, 1000)
}
function stopElapsedTimer() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

watch(activeCorrida, (val: Ride | null) => {
  if (val && ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(val.status)) {
    startElapsedTimer()
  } else {
    stopElapsedTimer(); elapsedTime.value = '0:00'
  }
}, { immediate: true })

onUnmounted(stopElapsedTimer)

const originPlace      = ref<PlaceSuggestion | null>(null)
const destinationPlace = ref<PlaceSuggestion | null>(null)
const serviceType      = ref<'PASSENGER' | 'FREIGHT'>('PASSENGER')
const vehicleType      = ref<'MOTORCYCLE' | 'CAR' | 'PICKUP_TRUCK' | 'TRUCK'>('MOTORCYCLE')
const notes            = ref('')
const recipientName    = ref('')
const recipientPhone   = ref('')
const cargoDescription = ref('')
const cargoWeight      = ref<number | null>(null)
const declaredValue    = ref<number | null>(null)

watch(serviceType, () => {
  vehicleType.value = 'MOTORCYCLE'
  priceEstimate.value = null
  if (canCalculate.value) autoCalculatePrice()
})

// ─── Computados ───────────────────────────────────────────────────────────────
const canCalculate = computed(() => !!originPlace.value && !!destinationPlace.value)
const canSubmit    = computed(() =>
  canCalculate.value && !!priceEstimate.value && (kycStatus.value === undefined || kycStatus.value === 'APPROVED')
)

const TRANSPORTE_SUBCATEGORIES = ['carros', 'motos', 'Mudanzas', 'Delivery']

const canViewAvailableCorridas = computed(() =>
  userCategory.value === 'Transporte' &&
  TRANSPORTE_SUBCATEGORIES.includes(userSubcategory.value ?? '')
)

const availableCorridas = computed(() => corridas.value.filter((c: Ride) => c.status === 'PENDING'))
const historyList       = computed(() => canManageCorridas.value ? corridas.value : myCorridas.value)

const subtitleText = computed(() => {
  if (canManageCorridas.value && canRequestCorrida.value) return 'Solicita viajes, fletes o acepta corridas como conductor'
  if (canManageCorridas.value) return 'Gestiona corridas y fletes como conductor'
  return 'Solicita viajes y fletes rápidos y seguros'
})

const historySubtitle = computed(() =>
  canManageCorridas.value ? 'Tus asignaciones como conductor' : 'Tus viajes solicitados'
)

const totalEarnings = computed(() =>
  historyList.value.reduce((sum: number, c: Ride) => sum + (c.status === 'COMPLETED' ? (c.price ?? 0) : 0), 0)
)

const headerStats = computed(() => {
  const list = historyList.value as Ride[]
  return [
    { label: 'Total viajes',   value: String(list.length) },
    { label: 'Completados',    value: String(list.filter((c: Ride) => c.status === 'COMPLETED').length) },
    { label: 'Cancelados',     value: String(list.filter((c: Ride) => c.status === 'CANCELLED').length) },
    { label: canManageCorridas.value ? 'Ingresos' : 'Gastado',
      value: `$${formatPrice(totalEarnings.value)}` },
  ]
})

watch(vehicleType, () => { if (canCalculate.value) autoCalculatePrice() })

// ─── Autocomplete ─────────────────────────────────────────────────────────────
function onOriginSelected(_: PlaceSuggestion) {
  priceEstimate.value = null
  if (destinationPlace.value) autoCalculatePrice()
}

function onDestinationSelected(_: PlaceSuggestion) {
  priceEstimate.value = null
  if (originPlace.value) autoCalculatePrice()
}

// ─── Precio ───────────────────────────────────────────────────────────────────
async function autoCalculatePrice() {
  if (!originPlace.value || !destinationPlace.value) return
  calculatingPrice.value = true
  priceEstimate.value = null
  try {
    priceEstimate.value = await calculatePrice(
      originPlace.value.lat, originPlace.value.lng,
      destinationPlace.value.lat, destinationPlace.value.lng,
      vehicleType.value
    )
  } catch { /* error en banner global */ } finally {
    calculatingPrice.value = false
  }
}

async function recalculatePrice() {
  priceEstimate.value = null
  await autoCalculatePrice()
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function handleSubmitRequest() {
  if (!originPlace.value || !destinationPlace.value) return
  if (!priceEstimate.value) {
    await autoCalculatePrice()
    if (!priceEstimate.value) return
  }
  try {
    await createCorrida({
      serviceType: serviceType.value,
      origin: originPlace.value.label,
      destination: destinationPlace.value.label,
      originLat: originPlace.value.lat,
      originLng: originPlace.value.lng,
      destinationLat: destinationPlace.value.lat,
      destinationLng: destinationPlace.value.lng,
      vehicleType: vehicleType.value,
      notes: notes.value,
      ...(serviceType.value === 'FREIGHT' ? {
        recipientName: recipientName.value || undefined,
        recipientPhone: recipientPhone.value || undefined,
        cargoDescription: cargoDescription.value || undefined,
        cargoWeight: cargoWeight.value ?? undefined,
        declaredValue: declaredValue.value ?? undefined,
      } : {}),
    })
    originPlace.value = null; destinationPlace.value = null
    notes.value = ''; priceEstimate.value = null
    recipientName.value = ''; recipientPhone.value = ''
    cargoDescription.value = ''; cargoWeight.value = null; declaredValue.value = null
    activeTab.value = 'history'
    refreshHistory()
  } catch { /* error en banner global */ }
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
async function handleCancel(id: string, reason?: string) {
  cancelling.value = true
  try {
    await cancelCorrida(id, reason)
    showCancelModal.value = false; corridaToCancelId.value = null
    showToast('success', 'Viaje cancelado correctamente')
    await refreshHistory()
  } catch { showToast('error', 'No se pudo cancelar el viaje') }
  finally { cancelling.value = false }
}

async function handleAccept(id: string) {
  acceptingId.value = id
  try {
    await acceptCorrida(id)
    await refreshAvailable()
    activeTab.value = 'history'
  } finally { acceptingId.value = null }
}

async function handleUpdateStatus(id: string, status: 'IN_PROGRESS' | 'COMPLETED', deliveryCode?: string) {
  // Envío: completar exige el código de quien recibe.
  const ride = historyList.value.find(r => r.id === id)
  if (status === 'COMPLETED' && ride?.hasDeliveryCode && !deliveryCode) {
    codeRideId.value = id
    deliveryCodeInput.value = ''
    return
  }
  updatingId.value = id
  try {
    await updateCorridaStatus(id, status, deliveryCode)
    codeRideId.value = null
    await refreshHistory()
  } catch (e) {
    showToast('error', getApiErrorMessage(e, 'No se pudo actualizar la corrida'))
  } finally { updatingId.value = null }
}

// ─── Perfil de conductor, cancelación del conductor y código de entrega ─────
const driverStatus = ref<'PENDING' | 'APPROVED' | 'REJECTED' | null>(null)
const cancelTargetStatus = computed(() =>
  corridaToCancelId.value
    ? (historyList.value.find(r => r.id === corridaToCancelId.value)?.status
      ?? (activeCorrida.value?.id === corridaToCancelId.value ? activeCorrida.value?.status : undefined))
    : undefined,
)
const driverCancelId = ref<string | null>(null)
const driverCancelReason = ref('')
const driverCancelNoShow = ref(false)
const codeRideId = ref<string | null>(null)
const deliveryCodeInput = ref('')

function openDriverCancel(id: string) {
  driverCancelId.value = id
  driverCancelReason.value = ''
  driverCancelNoShow.value = false
}

async function submitDriverCancel() {
  const id = driverCancelId.value
  if (!id) return
  updatingId.value = id
  try {
    const res = await driverCancelCorrida(id, driverCancelReason.value.trim(), driverCancelNoShow.value)
    driverCancelId.value = null
    showToast('success', res.requeued ? 'Soltaste la corrida: queda disponible para otro conductor' : 'Corrida cancelada')
    await Promise.all([refreshHistory(), refreshAvailable()])
  } catch (e) {
    showToast('error', getApiErrorMessage(e, 'No se pudo cancelar la corrida'))
  } finally { updatingId.value = null }
}

function submitDeliveryCode() {
  if (codeRideId.value) handleUpdateStatus(codeRideId.value, 'COMPLETED', deliveryCodeInput.value)
}

async function refreshAvailable() { try { await fetchAvailableCorridas() } catch {} }

async function refreshHistory() {
  try {
    if (canManageCorridas.value) await fetchDriverCorridas()
    else await fetchMyCorridas()
  } catch {}
}

// ─── Ciclo de vida ────────────────────────────────────────────────────────────
onMounted(async () => {
  await reloadPermissions()
  await refreshHistory()
  if (!canRequestCorrida.value && canViewAvailableCorridas.value) activeTab.value = 'available'
  else if (!canRequestCorrida.value) activeTab.value = 'history'
  if (canViewAvailableCorridas.value) refreshAvailable()
  if (canRequestCorrida.value) fetchMyKycStatus()
})
</script>
