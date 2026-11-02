<template>
  <div class="card p-5">
    <div v-if="loading" class="skeleton h-16 rounded-xl" />

    <div v-else-if="profile?.status === 'APPROVED'" class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-sm text-gray-700">
        🚗 Conductor habilitado · <strong>{{ VEHICLE_LABELS[profile.vehicleType] }}</strong>
        {{ profile.vehicleModel }} · placa <span class="font-mono">{{ profile.vehiclePlate }}</span>
      </p>
      <button class="text-xs font-semibold text-gray-500 hover:text-gray-800" @click="editing = !editing">
        {{ editing ? 'Cancelar' : 'Cambiar vehículo' }}
      </button>
    </div>

    <div v-else-if="profile?.status === 'PENDING'" class="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">
      Tu perfil de conductor está en revisión. Te avisaremos cuando puedas aceptar corridas.
    </div>

    <template v-else>
      <p class="font-semibold text-gray-900">Para aceptar corridas y envíos, registra tu vehículo</p>
      <p class="text-xs text-gray-500 mt-0.5">Un administrador lo revisa junto con tu verificación de identidad.</p>
      <p v-if="profile?.status === 'REJECTED'" class="mt-2 text-sm text-red-600">
        Tu solicitud anterior fue rechazada: "{{ profile.rejectionReason }}". Corrige los datos y envíala de nuevo.
      </p>
    </template>

    <form v-if="showForm" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3" @submit.prevent="submit">
      <label class="text-xs text-gray-600">Vehículo
        <select v-model="form.vehicleType" class="input-field mt-1 bg-white">
          <option v-for="(label, value) in VEHICLE_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
      <label class="text-xs text-gray-600">Placa
        <input v-model="form.vehiclePlate" maxlength="10" class="input-field mt-1 font-mono uppercase" placeholder="AB123CD" />
      </label>
      <label class="text-xs text-gray-600">Marca y modelo
        <input v-model="form.vehicleModel" maxlength="60" class="input-field mt-1" placeholder="Bera SBR 150" />
      </label>
      <label class="text-xs text-gray-600">Color (opcional)
        <input v-model="form.vehicleColor" maxlength="30" class="input-field mt-1" placeholder="Negro" />
      </label>
      <label class="text-xs text-gray-600 sm:col-span-2">Número de licencia de conducir
        <input v-model="form.licenseNumber" maxlength="20" class="input-field mt-1 font-mono uppercase" placeholder="V12345678" />
      </label>
      <p v-if="error" class="sm:col-span-2 text-sm text-red-600">{{ error }}</p>
      <div class="sm:col-span-2 flex justify-end">
        <button type="submit" class="btn-primary text-sm" :disabled="saving">{{ saving ? 'Enviando…' : 'Enviar para revisión' }}</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRides, type RideDriverProfile, type RideVehicleType } from '~/composables/delivery/useRides'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const emit = defineEmits<{ status: [RideDriverProfile['status'] | null] }>()

const VEHICLE_LABELS: Record<RideVehicleType, string> = {
  MOTORCYCLE: 'Moto',
  CAR: 'Carro',
  PICKUP_TRUCK: 'Pickup',
  TRUCK: 'Camión',
}

const { getDriverProfile, submitDriverProfile } = useRides()
const profile = ref<RideDriverProfile | null>(null)
const loading = ref(true)
const saving = ref(false)
const editing = ref(false)
const error = ref<string | null>(null)
const form = ref({ vehicleType: 'MOTORCYCLE' as RideVehicleType, vehiclePlate: '', vehicleModel: '', vehicleColor: '', licenseNumber: '' })

const showForm = computed(
  () => !loading.value && (!profile.value || profile.value.status === 'REJECTED' || editing.value),
)

async function load() {
  loading.value = true
  try {
    profile.value = await getDriverProfile()
    if (profile.value) {
      form.value = {
        vehicleType: profile.value.vehicleType,
        vehiclePlate: profile.value.vehiclePlate,
        vehicleModel: profile.value.vehicleModel,
        vehicleColor: profile.value.vehicleColor ?? '',
        licenseNumber: profile.value.licenseNumber,
      }
    }
  } catch {
    profile.value = null
  } finally {
    loading.value = false
    emit('status', profile.value?.status ?? null)
  }
}

async function submit() {
  error.value = null
  if (form.value.vehiclePlate.trim().length < 5 || form.value.vehicleModel.trim().length < 2 || form.value.licenseNumber.trim().length < 5) {
    error.value = 'Completa placa, modelo y licencia'
    return
  }
  saving.value = true
  try {
    profile.value = await submitDriverProfile({
      ...form.value,
      vehicleColor: form.value.vehicleColor || undefined,
    })
    editing.value = false
    emit('status', profile.value.status)
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo enviar')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
