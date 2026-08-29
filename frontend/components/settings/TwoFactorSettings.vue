<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg mr-3">
        <ShieldCheckIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Verificación en dos pasos</h3>
    </div>

    <!-- Estado: activada -->
    <div v-if="user?.twoFactorEnabled" class="space-y-4">
      <div class="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
        <div class="flex items-center gap-3">
          <CheckCircleIcon class="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <div class="font-semibold text-gray-900">Verificación en dos pasos activada</div>
            <div class="text-sm text-gray-500">Tu cuenta está protegida con un código adicional al iniciar sesión</div>
          </div>
        </div>
      </div>
      <button
        class="w-full px-6 py-3 text-red-600 font-semibold rounded-xl border-2 border-red-200 hover:bg-red-50 transition-colors duration-200"
        @click="openDisableModal"
      >
        Desactivar verificación en dos pasos
      </button>
    </div>

    <!-- Estado: desactivada -->
    <div v-else class="space-y-4">
      <div class="p-4 bg-gray-50 rounded-xl">
        <div class="font-semibold text-gray-900 mb-1">Protege tu cuenta con un paso adicional</div>
        <div class="text-sm text-gray-500">
          Cada vez que inicies sesión, además de tu contraseña deberás ingresar un código generado por una app de autenticación (Google Authenticator, Authy, etc.).
        </div>
      </div>
      <div v-if="isHighPrivilegeRole" class="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        <InformationCircleIcon class="h-4 w-4 flex-shrink-0" />
        Recomendamos activar la verificación en dos pasos para cuentas con acceso a billetera.
      </div>
      <button
        class="w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-emerald-500 to-emerald-600"
        @click="openSetupModal"
      >
        Activar verificación en dos pasos
      </button>
    </div>

    <!-- ════════════════ MODAL: Setup (QR + confirmación) ════════════════ -->
    <TransitionRoot appear :show="setupModalOpen" as="template">
      <Dialog as="div" @close="closeSetupModal" class="relative z-50">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black bg-opacity-25" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <!-- Paso 1: QR + código -->
                <template v-if="setupStep === 'scan'">
                  <DialogTitle as="h3" class="text-lg font-bold text-gray-900 mb-4">
                    Activar verificación en dos pasos
                  </DialogTitle>

                  <div v-if="loadingSetup" class="flex items-center justify-center py-12">
                    <svg class="animate-spin h-8 w-8 text-workplace-red" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>

                  <div v-else class="space-y-4">
                    <p class="text-sm text-gray-500">
                      Escanea este código con Google Authenticator, Authy o una app similar.
                    </p>
                    <div class="flex justify-center">
                      <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="Código QR" class="w-44 h-44 rounded-xl border border-gray-200 p-2" />
                    </div>
                    <div class="p-3 bg-gray-50 rounded-xl">
                      <p class="text-xs text-gray-500 mb-1">¿No puedes escanear? Ingresa este código manualmente:</p>
                      <p class="font-mono text-sm font-semibold text-gray-900 break-all">{{ secret }}</p>
                    </div>

                    <div
                      v-if="setupError"
                      class="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
                    >
                      <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                      <span>{{ setupError }}</span>
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-gray-700 mb-2">Código de verificación</label>
                      <input
                        v-model="confirmCode"
                        type="text"
                        inputmode="numeric"
                        maxlength="6"
                        placeholder="123456"
                        class="input-field text-center text-lg font-mono tracking-widest"
                      />
                    </div>

                    <div class="flex gap-2">
                      <button class="flex-1 btn-primary" :disabled="confirming || confirmCode.length !== 6" @click="confirmSetup">
                        <span v-if="confirming">Verificando...</span>
                        <span v-else>Activar</span>
                      </button>
                      <button type="button" class="btn-secondary" @click="closeSetupModal">Cancelar</button>
                    </div>
                  </div>
                </template>

                <!-- Paso 2: backup codes -->
                <template v-else-if="setupStep === 'backup-codes'">
                  <DialogTitle as="h3" class="text-lg font-bold text-gray-900 mb-2">
                    ¡Verificación activada!
                  </DialogTitle>
                  <p class="text-sm text-gray-500 mb-4">
                    Guarda estos códigos de respaldo en un lugar seguro. Cada uno solo se puede usar una vez y te permiten acceder si pierdes tu dispositivo.
                  </p>

                  <div class="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-xl mb-4">
                    <span v-for="(c, i) in backupCodes" :key="i" class="font-mono text-sm text-center text-gray-900 py-1">{{ c }}</span>
                  </div>

                  <div class="flex gap-2">
                    <button type="button" class="flex-1 btn-secondary" @click="copyBackupCodes">
                      {{ copied ? 'Copiado' : 'Copiar todos' }}
                    </button>
                    <button type="button" class="flex-1 btn-primary" @click="closeSetupModal">Listo</button>
                  </div>
                </template>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- ════════════════ MODAL: Desactivar ════════════════ -->
    <TransitionRoot appear :show="disableModalOpen" as="template">
      <Dialog as="div" @close="closeDisableModal" class="relative z-50">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black bg-opacity-25" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h3" class="text-lg font-bold text-gray-900 mb-4">
                  Desactivar verificación en dos pasos
                </DialogTitle>
                <p class="text-sm text-gray-500 mb-4">
                  Ingresa tu contraseña y un código de tu app de autenticación (o un código de respaldo) para confirmar.
                </p>

                <div
                  v-if="disableError"
                  class="flex items-start gap-2.5 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
                >
                  <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{{ disableError }}</span>
                </div>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                    <input v-model="disableForm.password" type="password" class="input-field" placeholder="••••••••" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Código de verificación o de respaldo</label>
                    <input v-model="disableForm.code" type="text" class="input-field font-mono" placeholder="123456 o XXXX-XXXX" />
                  </div>
                </div>

                <div class="flex gap-2 mt-6">
                  <button
                    class="flex-1 px-6 py-3 text-white font-semibold rounded-xl bg-red-600 hover:bg-red-700 transition-colors duration-200 disabled:opacity-60"
                    :disabled="disabling || !disableForm.password || !disableForm.code"
                    @click="confirmDisable"
                  >
                    <span v-if="disabling">Desactivando...</span>
                    <span v-else>Desactivar</span>
                  </button>
                  <button type="button" class="btn-secondary" @click="closeDisableModal">Cancelar</button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/auth/useAuth'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const { user, setupTwoFactor, enableTwoFactor, disableTwoFactor, updateLocalUser } = useAuth()

// role=PROFESIONAL ya no distingue COMMERCE de FREELANCER — accountType
// (resuelto por el backend) es la fuente real para excluir a FREELANCER
// (un freelancer puro no maneja wallet de negocio como un comercio).
const isHighPrivilegeRole = computed(() =>
  ['SUPERADMIN', 'ADMIN'].includes(user.value?.role ?? '') || user.value?.accountType === 'COMMERCE'
)

// ─── Setup flow ───────────────────────────────────────────────────────────────

const setupModalOpen = ref(false)
const setupStep = ref<'scan' | 'backup-codes'>('scan')
const loadingSetup = ref(false)
const confirming = ref(false)
const setupError = ref('')
const secret = ref('')
const qrCodeDataUrl = ref('')
const confirmCode = ref('')
const backupCodes = ref<string[]>([])
const copied = ref(false)

async function openSetupModal() {
  setupModalOpen.value = true
  setupStep.value = 'scan'
  setupError.value = ''
  confirmCode.value = ''
  loadingSetup.value = true
  try {
    const data = await setupTwoFactor()
    secret.value = data.secret
    qrCodeDataUrl.value = data.qrCodeDataUrl
  } catch (err: unknown) {
    setupError.value = getApiErrorMessage(err, 'No se pudo iniciar la configuración. Intenta de nuevo.')
  } finally {
    loadingSetup.value = false
  }
}

function closeSetupModal() {
  setupModalOpen.value = false
  confirmCode.value = ''
  copied.value = false
}

async function confirmSetup() {
  confirming.value = true
  setupError.value = ''
  try {
    const result = await enableTwoFactor(confirmCode.value)
    backupCodes.value = result.backupCodes
    updateLocalUser({ twoFactorEnabled: true })
    setupStep.value = 'backup-codes'
  } catch (err: unknown) {
    setupError.value = getApiErrorMessage(err, 'Código inválido o expirado.')
  } finally {
    confirming.value = false
  }
}

async function copyBackupCodes() {
  try {
    await navigator.clipboard.writeText(backupCodes.value.join('\n'))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Clipboard no disponible — sin acción adicional
  }
}

// ─── Disable flow ─────────────────────────────────────────────────────────────

const disableModalOpen = ref(false)
const disabling = ref(false)
const disableError = ref('')
const disableForm = ref({ password: '', code: '' })

function openDisableModal() {
  disableModalOpen.value = true
  disableError.value = ''
  disableForm.value = { password: '', code: '' }
}

function closeDisableModal() {
  disableModalOpen.value = false
}

async function confirmDisable() {
  disabling.value = true
  disableError.value = ''
  try {
    await disableTwoFactor(disableForm.value.password, disableForm.value.code)
    closeDisableModal()
  } catch (err: unknown) {
    disableError.value = getApiErrorMessage(err, 'No se pudo desactivar. Verifica tu contraseña y código.')
  } finally {
    disabling.value = false
  }
}
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white;
}

.btn-primary {
  @apply px-6 py-3 text-white font-semibold rounded-xl bg-workplace-red hover:bg-red-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply px-6 py-3 text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors duration-200;
}
</style>
