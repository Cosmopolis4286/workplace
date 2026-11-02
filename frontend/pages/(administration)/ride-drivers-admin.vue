<template>
  <div>
    <PageHeader
      title="Conductores"
      description="Solicitudes para aceptar corridas y envíos: vehículo, placa y licencia. Solo se aprueba a quien tiene la identidad verificada."
      :icon="TruckIcon"
      :breadcrumb="[{ label: 'Administración' }, { label: 'Conductores' }]"
      :stats="[{ label: 'Por revisar', value: String(pendingCount) }]"
    />

    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="t in TABS"
        :key="t.value"
        class="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
        :class="tab === t.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'"
        @click="setTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ error }}</div>
    <div v-if="loading" class="card p-6 animate-pulse h-24" />
    <div v-else-if="profiles.length === 0" class="card p-10 text-center text-sm text-gray-500">No hay solicitudes en esta lista.</div>

    <ul v-else class="space-y-3">
      <li v-for="p in profiles" :key="p.id" class="card p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-bold text-gray-900">{{ p.userName || p.userEmail }}</p>
            <p class="text-xs text-gray-500">{{ p.userEmail }}<template v-if="p.userPhone"> · {{ p.userPhone }}</template></p>
            <dl class="mt-2 text-sm text-gray-700 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5">
              <dt class="text-gray-400">Vehículo</dt><dd>{{ VEHICLE_LABELS[p.vehicleType] }} · {{ p.vehicleModel }}<template v-if="p.vehicleColor"> · {{ p.vehicleColor }}</template></dd>
              <dt class="text-gray-400">Placa</dt><dd class="font-mono">{{ p.vehiclePlate }}</dd>
              <dt class="text-gray-400">Licencia</dt><dd class="font-mono">{{ p.licenseNumber }}</dd>
              <dt class="text-gray-400">KYC</dt>
              <dd :class="p.kycStatus === 'APPROVED' ? 'text-green-700' : 'text-amber-700'">{{ p.kycStatus === 'APPROVED' ? 'Verificado' : 'Sin verificar' }}</dd>
            </dl>
            <p v-if="p.rejectionReason" class="text-xs text-red-600 mt-1">Rechazada: "{{ p.rejectionReason }}"</p>
          </div>
          <div v-if="p.status === 'PENDING'" class="flex gap-2 flex-shrink-0">
            <button class="btn-secondary text-sm" :disabled="busyId === p.id" @click="askReject(p)">Rechazar</button>
            <button class="btn-primary text-sm" :disabled="busyId === p.id || p.kycStatus !== 'APPROVED'" :title="p.kycStatus !== 'APPROVED' ? 'Falta verificar su identidad' : ''" @click="approve(p)">Aprobar</button>
          </div>
        </div>
      </li>
    </ul>

    <Teleport to="body">
      <div v-if="rejecting" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="rejecting = null" />
        <form class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3" @submit.prevent="submitReject">
          <h3 class="font-bold text-gray-900">Rechazar conductor</h3>
          <p class="text-sm text-gray-600">{{ rejecting.userName || rejecting.userEmail }} verá el motivo y podrá corregir los datos.</p>
          <textarea v-model="reason" rows="3" maxlength="300" class="input-field resize-none" placeholder="Ej. La licencia no corresponde al titular" />
          <p v-if="rejectError" class="text-sm text-red-600">{{ rejectError }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary text-sm" @click="rejecting = null">Cancelar</button>
            <button type="submit" class="btn-primary text-sm" :disabled="busyId === rejecting.id">Rechazar</button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TruckIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useRides, type AdminRideDriverProfile, type RideDriverProfileStatus, type RideVehicleType } from '~/composables/delivery/useRides'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ middleware: 'auth' })

const TABS: { value: RideDriverProfileStatus; label: string }[] = [
  { value: 'PENDING', label: 'Por revisar' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'REJECTED', label: 'Rechazados' },
]
const VEHICLE_LABELS: Record<RideVehicleType, string> = {
  MOTORCYCLE: 'Moto',
  CAR: 'Carro',
  PICKUP_TRUCK: 'Pickup',
  TRUCK: 'Camión',
}

const { listDriverProfiles, reviewDriverProfile } = useRides()
const tab = ref<RideDriverProfileStatus>('PENDING')
const profiles = ref<AdminRideDriverProfile[]>([])
const pendingCount = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const rejecting = ref<AdminRideDriverProfile | null>(null)
const reason = ref('')
const rejectError = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    profiles.value = await listDriverProfiles(tab.value)
    if (tab.value === 'PENDING') pendingCount.value = profiles.value.length
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar las solicitudes')
  } finally {
    loading.value = false
  }
}

function setTab(value: RideDriverProfileStatus) {
  tab.value = value
  load()
}

async function approve(p: AdminRideDriverProfile) {
  busyId.value = p.id
  error.value = null
  try {
    await reviewDriverProfile(p.id, 'APPROVED')
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo aprobar')
  } finally {
    busyId.value = null
  }
}

function askReject(p: AdminRideDriverProfile) {
  rejecting.value = p
  reason.value = ''
  rejectError.value = null
}

async function submitReject() {
  if (!rejecting.value) return
  if (reason.value.trim().length < 5) {
    rejectError.value = 'Explica el motivo (mínimo 5 caracteres)'
    return
  }
  const target = rejecting.value
  busyId.value = target.id
  try {
    await reviewDriverProfile(target.id, 'REJECTED', reason.value.trim())
    rejecting.value = null
    await load()
  } catch (e) {
    rejectError.value = getApiErrorMessage(e, 'No se pudo rechazar')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>
