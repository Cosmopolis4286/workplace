<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-4">
      <div class="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg mr-3">
        <DevicePhoneMobileIcon class="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-gray-900">Verificar teléfono</h3>
        <p class="text-sm text-gray-500">Te enviamos un código por SMS para confirmar que el número es tuyo.</p>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>

    <div v-else-if="status?.verified" class="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
      <CheckBadgeIcon class="h-5 w-5" />
      <span>Teléfono verificado{{ status.phone ? `: ${status.phone}` : '' }}.</span>
    </div>

    <p v-else-if="!status?.available" class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
      La verificación por SMS no está disponible por ahora.
    </p>

    <form v-else-if="step === 'phone'" class="space-y-3" @submit.prevent="sendCode">
      <label for="otp-phone" class="block text-sm font-semibold text-gray-700">Número móvil</label>
      <input
        id="otp-phone"
        v-model="phone"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        required
        class="input-field w-full"
        placeholder="+58 412 1234567"
      >
      <div class="flex justify-end">
        <button type="submit" class="btn-primary" :disabled="busy || !phone.trim()">
          {{ busy ? 'Enviando…' : 'Enviar código' }}
        </button>
      </div>
    </form>

    <form v-else class="space-y-3" @submit.prevent="verifyCode">
      <p class="text-sm text-gray-600">
        Escribe el código de 6 dígitos que enviamos a {{ destination || 'tu teléfono' }}. Vence en 5 minutos.
      </p>
      <input
        v-model="code"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        required
        class="input-field w-40 tracking-[0.4em] text-center text-lg"
        placeholder="••••••"
      >
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" class="btn-secondary" :disabled="busy" @click="restart">Cambiar número</button>
        <button type="submit" class="btn-primary" :disabled="busy || !/^\d{6}$/.test(code)">
          {{ busy ? 'Verificando…' : 'Verificar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CheckBadgeIcon, DevicePhoneMobileIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

interface PhoneStatus {
  available: boolean
  verified: boolean
  phone: string | null
}

const emit = defineEmits<{ success: [message: string]; error: [message: string] }>()
const { get, post } = useApi()

const status = ref<PhoneStatus | null>(null)
const loading = ref(true)
const busy = ref(false)
const step = ref<'phone' | 'code'>('phone')
const phone = ref('')
const code = ref('')
const destination = ref('')

async function load() {
  loading.value = true
  try {
    status.value = await get<PhoneStatus>('/auth/phone/status')
    if (status.value.phone) phone.value = status.value.phone
  } catch {
    status.value = null
  } finally {
    loading.value = false
  }
}

async function sendCode() {
  busy.value = true
  try {
    const res = await post<{ destination?: string }>('/auth/phone/send-verification', { phone: phone.value.trim() })
    destination.value = res?.destination ?? ''
    code.value = ''
    step.value = 'code'
  } catch (e) {
    emit('error', getApiErrorMessage(e, 'No se pudo enviar el código'))
  } finally {
    busy.value = false
  }
}

async function verifyCode() {
  busy.value = true
  try {
    const res = await post<{ verified: boolean; phone?: string }>('/auth/phone/verify', { code: code.value })
    status.value = { available: true, verified: res.verified, phone: res.phone ?? status.value?.phone ?? null }
    emit('success', 'Teléfono verificado')
  } catch (e) {
    emit('error', getApiErrorMessage(e, 'El código no es válido'))
  } finally {
    busy.value = false
  }
}

function restart() {
  step.value = 'phone'
  code.value = ''
}

onMounted(load)
</script>
