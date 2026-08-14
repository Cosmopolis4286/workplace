<template>
  <div v-if="showAppLockCard" class="card-premium p-6 mt-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg mr-3">
        <LockClosedIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Bloqueo de la App</h3>
    </div>

    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
      <div>
        <div class="font-semibold text-gray-900">Solicitar {{ biometryLabel }} al abrir la app</div>
        <div class="text-sm text-gray-500">Protege tu sesión con tu huella o rostro cada vez que vuelvas a abrir la app</div>
      </div>
      <button
        :class="[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 flex-shrink-0',
          appLockEnabled ? 'bg-workplace-red' : 'bg-gray-300'
        ]"
        @click="toggle"
      >
        <span
          :class="[
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
            appLockEnabled ? 'translate-x-6' : 'translate-x-1'
          ]"
        />
      </button>
    </div>
    <p class="mt-4 text-xs text-gray-400 text-center">Esta preferencia se guarda solo en este dispositivo</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { LockClosedIcon } from '@heroicons/vue/24/outline'
import { BiometryType } from '@aparajita/capacitor-biometric-auth'
import { useBiometric } from '~/composables/auth/useBiometric'

const emit = defineEmits<{
  toggled: [message: string]
}>()

const { isNative, isAvailable: isBiometryAvailable, getBiometryType, isAppLockEnabled, setAppLockEnabled } = useBiometric()

const showAppLockCard = ref(false)
const appLockEnabled = ref(false)
const biometryType = ref(BiometryType.none)

const biometryLabel = computed(() => {
  switch (biometryType.value) {
    case BiometryType.faceId:
    case BiometryType.faceAuthentication:
      return 'reconocimiento facial'
    case BiometryType.touchId:
    case BiometryType.fingerprintAuthentication:
      return 'huella digital'
    case BiometryType.irisAuthentication:
      return 'reconocimiento de iris'
    default:
      return 'verificación biométrica'
  }
})

async function toggle() {
  const enabled = !appLockEnabled.value
  setAppLockEnabled(enabled)
  appLockEnabled.value = enabled
  emit('toggled', enabled ? 'Bloqueo de app activado' : 'Bloqueo de app desactivado')
}

onMounted(async () => {
  if (isNative) {
    showAppLockCard.value = await isBiometryAvailable()
    if (showAppLockCard.value) {
      biometryType.value = await getBiometryType()
      appLockEnabled.value = isAppLockEnabled()
    }
  }
})
</script>
