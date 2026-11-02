<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="activeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="$emit('close')">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
          <button class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" @click="$emit('close')">
            <XMarkIcon class="h-5 w-5" />
          </button>

          <!-- PIN setup / change -->
          <template v-if="activeModal === 'pin'">
            <ModalHeader icon-class="bg-gray-100" icon-color="text-gray-700" :title="wallet?.hasPin ? 'Cambiar PIN' : 'Configurar PIN'" subtitle="El PIN protege los retiros de tu billetera">
              <template #icon><LockClosedIcon class="h-5 w-5" /></template>
            </ModalHeader>
            <form class="space-y-4" @submit.prevent="submitPin">
              <PinField v-if="wallet?.hasPin" v-model="form.currentPin" label="PIN actual" placeholder="••••••" />
              <PinField v-model="form.pin" :label="wallet?.hasPin ? 'Nuevo PIN' : 'Elige un PIN de 6 dígitos'" />
              <PinField v-model="form.pinConfirm" :label="wallet?.hasPin ? 'Confirmar nuevo PIN' : 'Confirma tu PIN'" />
              <p v-if="form.pin && form.pinConfirm && form.pin !== form.pinConfirm" class="text-xs text-red-600">Los PINs no coinciden</p>
              <p class="text-xs text-gray-500">Usa 6 dígitos. Evita secuencias simples como 123456 o 000000.</p>
              <ModalError :message="modalError" />
              <ModalActions :loading="loading" :confirm-label="wallet?.hasPin ? 'Cambiar PIN' : 'Guardar PIN'" @cancel="$emit('close')" />
            </form>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { LockClosedIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import ModalHeader from '~/components/wallet/modal-fields/ModalHeader.vue'
import PinField from '~/components/wallet/modal-fields/PinField.vue'
import ModalError from '~/components/wallet/modal-fields/ModalError.vue'
import ModalActions from '~/components/wallet/modal-fields/ModalActions.vue'
import type { Wallet } from '~/composables/wallets/useWallets'

// Solo queda el PIN: la billetera ya no se recarga ni transfiere, y el retiro
// es una solicitud (WithdrawalRequestModal).
type ModalType = 'pin'

const props = defineProps<{
  activeModal: ModalType | null
  wallet: Wallet | null
  loading: boolean
  modalError: string | null
}>()

const emit = defineEmits<{
  close: []
  'pin-submit': [payload: { pin: string; pinConfirm: string; currentPin: string }]
}>()

const emptyForm = () => ({ pin: '', pinConfirm: '', currentPin: '' })
const form = ref(emptyForm())

watch(() => props.activeModal, (type) => {
  if (type) form.value = emptyForm()
})

function submitPin() {
  emit('pin-submit', { pin: form.value.pin, pinConfirm: form.value.pinConfirm, currentPin: form.value.currentPin })
}
</script>

<style scoped>
.field-label { @apply block text-sm font-medium text-gray-700 mb-1; }
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
