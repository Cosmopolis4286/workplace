<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="activeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="$emit('close')">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
          <button class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" @click="$emit('close')">
            <XMarkIcon class="h-5 w-5" />
          </button>

          <!-- Deposit request: el saldo no se acredita al enviar el formulario — queda
               pendiente de que un admin verifique el comprobante (ver WalletDepositRequest) -->
          <template v-if="activeModal === 'deposit'">
            <ModalHeader icon-class="bg-green-100" icon-color="text-green-700" title="Solicitar depósito" subtitle="Un admin verificará tu comprobante antes de acreditar el saldo">
              <template #icon><ArrowDownTrayIcon class="h-5 w-5" /></template>
            </ModalHeader>
            <form class="space-y-4" @submit.prevent="submitDeposit">
              <AmountField v-model="form.amount" :currency="wallet?.currency" />
              <div>
                <label class="field-label">Método de pago *</label>
                <select v-model="form.paymentMethod" class="input" required>
                  <option value="" disabled>Selecciona un método</option>
                  <option value="Transferencia bancaria">Transferencia bancaria</option>
                  <option value="Pago móvil">Pago móvil</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Binance Pay">Binance Pay</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div><label class="field-label">Número de referencia</label><input v-model="form.reference" type="text" class="input" placeholder="Ej. TRX-123456" /></div>
              <div>
                <label class="field-label">Comprobante *</label>
                <input type="file" accept="image/png,image/jpeg,image/webp" class="input" required @change="onProofImageChange" />
                <p class="mt-1 text-xs text-gray-400">Foto o captura del comprobante de pago (jpeg, png o webp)</p>
              </div>
              <ModalError :message="modalError" />
              <ModalActions :loading="loading" confirm-label="Enviar solicitud" @cancel="$emit('close')" />
            </form>
          </template>

          <!-- Withdraw -->
          <template v-else-if="activeModal === 'withdraw'">
            <ModalHeader icon-class="bg-red-100" icon-color="text-red-700" title="Retirar fondos" :subtitle="`Disponible: ${formatMoney(wallet?.balance ?? 0, wallet?.currency)}`">
              <template #icon><ArrowUpTrayIcon class="h-5 w-5" /></template>
            </ModalHeader>
            <form class="space-y-4" @submit.prevent="confirmingWithdraw = true">
              <AmountField v-model="form.amount" :currency="wallet?.currency" :max="wallet?.balance" />
              <div>
                <label class="field-label">Cuenta donde recibes el retiro</label>
                <select v-if="payoutAccounts.length" v-model="form.payoutAccountId" class="input" required>
                  <option value="" disabled>Elige una cuenta</option>
                  <option v-for="a in payoutAccounts" :key="a.id" :value="a.id">{{ accountLabel(a) }}</option>
                </select>
                <p v-else class="text-xs text-amber-700">Primero agrega una cuenta en «Cuentas para retiros», más abajo en esta página.</p>
              </div>
              <div><label class="field-label">Descripción</label><input v-model="form.description" type="text" class="input" placeholder="Ej. Retiro a cuenta bancaria" /></div>
              <PinField v-model="form.pin" />
              <div v-if="confirmingWithdraw" class="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                <p class="text-xs text-amber-800 font-medium">
                  ¿Confirmas retirar <strong>{{ formatMoney(form.amount ?? 0, wallet?.currency) }}</strong>?
                  Se descuenta de tu saldo ahora y un admin lo transfiere a tu cuenta. Si no se puede pagar, vuelve a tu billetera.
                </p>
                <div class="flex justify-end gap-2">
                  <button type="button" class="btn-secondary text-xs py-1.5 px-3" :disabled="loading" @click="confirmingWithdraw = false">Cancelar</button>
                  <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-workplace-red text-white hover:bg-red-700 disabled:opacity-60" :disabled="loading" @click="submitWithdraw">
                    {{ loading ? 'Procesando…' : 'Sí, retirar' }}
                  </button>
                </div>
              </div>
              <ModalError :message="modalError" />
              <ModalActions v-if="!confirmingWithdraw" :loading="loading" confirm-label="Retirar" @cancel="$emit('close')" />
            </form>
          </template>

          <!-- Transfer -->
          <template v-else-if="activeModal === 'transfer'">
            <ModalHeader icon-class="bg-blue-100" icon-color="text-blue-700" title="Transferir fondos" :subtitle="`Disponible: ${formatMoney(wallet?.balance ?? 0, wallet?.currency)}`">
              <template #icon><ArrowsRightLeftIcon class="h-5 w-5" /></template>
            </ModalHeader>
            <form class="space-y-4" @submit.prevent="confirmingTransfer = true">
              <div>
                <label class="field-label">ID del destinatario *</label>
                <input v-model="form.recipientUserId" type="text" class="input font-mono text-sm" placeholder="UUID del usuario" required />
                <p class="mt-1 text-xs text-amber-600">Verifica cuidadosamente el ID — una transferencia a un ID incorrecto no se puede revertir.</p>
              </div>
              <AmountField v-model="form.amount" :currency="wallet?.currency" :max="wallet?.balance" />
              <div><label class="field-label">Descripción</label><input v-model="form.description" type="text" class="input" placeholder="Motivo de la transferencia" /></div>
              <PinField v-model="form.pin" />
              <div v-if="confirmingTransfer" class="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                <p class="text-xs text-amber-800 font-medium">
                  ¿Confirmas transferir <strong>{{ formatMoney(form.amount ?? 0, wallet?.currency) }}</strong> al ID
                  <strong class="font-mono break-all">{{ form.recipientUserId }}</strong>?
                  Esta acción no se puede deshacer.
                </p>
                <div class="flex justify-end gap-2">
                  <button type="button" class="btn-secondary text-xs py-1.5 px-3" :disabled="loading" @click="confirmingTransfer = false">Cancelar</button>
                  <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-workplace-red text-white hover:bg-red-700 disabled:opacity-60" :disabled="loading" @click="submitTransfer">
                    {{ loading ? 'Procesando…' : 'Sí, transferir' }}
                  </button>
                </div>
              </div>
              <ModalError :message="modalError" />
              <ModalActions v-if="!confirmingTransfer" :loading="loading" confirm-label="Transferir" @cancel="$emit('close')" />
            </form>
          </template>

          <!-- PIN setup / change -->
          <template v-else-if="activeModal === 'pin'">
            <ModalHeader icon-class="bg-gray-100" icon-color="text-gray-700" :title="wallet?.hasPin ? 'Cambiar PIN' : 'Configurar PIN'" subtitle="El PIN protege retiros, transferencias y pagos">
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
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import ModalHeader from '~/components/wallet/modal-fields/ModalHeader.vue'
import AmountField from '~/components/wallet/modal-fields/AmountField.vue'
import PinField from '~/components/wallet/modal-fields/PinField.vue'
import ModalError from '~/components/wallet/modal-fields/ModalError.vue'
import ModalActions from '~/components/wallet/modal-fields/ModalActions.vue'
import type { Wallet } from '~/composables/wallets/useWallets'
import { DIRECT_PAYMENT_METHOD_LABELS, type SellerPaymentAccount } from '~/composables/payments/useDirectPayments'

type ModalType = 'deposit' | 'withdraw' | 'transfer' | 'pin'

const props = defineProps<{
  activeModal: ModalType | null
  wallet: Wallet | null
  loading: boolean
  modalError: string | null
  formatMoney: (amount: number, currency?: string) => string
  payoutAccounts: SellerPaymentAccount[]
}>()

const emit = defineEmits<{
  close: []
  'deposit-request': [payload: { amount: number; paymentMethod: string; reference: string; proofImage: File }]
  withdraw: [payload: { amount: number; pin: string; description: string; payoutAccountId: string }]
  transfer: [payload: { recipientUserId: string; amount: number; pin: string; description: string }]
  'pin-submit': [payload: { pin: string; pinConfirm: string; currentPin: string }]
}>()

const emptyForm = () => ({
  amount: undefined as number | undefined,
  description: '', reference: '', paymentMethod: '',
  pin: '', pinConfirm: '', currentPin: '',
  recipientUserId: '', payoutAccountId: '',
})

const form = ref(emptyForm())
const proofImage = ref<File | null>(null)
const confirmingWithdraw = ref(false)
const confirmingTransfer = ref(false)

watch(() => props.activeModal, (type) => {
  if (!type) return
  form.value = emptyForm()
  proofImage.value = null
  confirmingWithdraw.value = false
  confirmingTransfer.value = false
})

function onProofImageChange(e: Event) {
  proofImage.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

function submitDeposit() {
  if (!form.value.amount || !form.value.paymentMethod || !proofImage.value) return
  emit('deposit-request', {
    amount: form.value.amount,
    paymentMethod: form.value.paymentMethod,
    reference: form.value.reference,
    proofImage: proofImage.value,
  })
}

function accountLabel(a: SellerPaymentAccount) {
  const where = a.method === 'ZELLE' ? a.email : a.method === 'PAGO_MOVIL' ? a.phone : a.accountNumber
  return `${DIRECT_PAYMENT_METHOD_LABELS[a.method]} · ${a.bankName ?? ''} ${where ?? ''} · ${a.holderName}`.replace(/\s+/g, ' ')
}

function submitWithdraw() {
  if (!form.value.amount || !form.value.pin || !form.value.payoutAccountId || props.loading) return
  emit('withdraw', {
    amount: form.value.amount,
    pin: form.value.pin,
    description: form.value.description,
    payoutAccountId: form.value.payoutAccountId,
  })
}

function submitTransfer() {
  if (!form.value.amount || !form.value.recipientUserId || !form.value.pin || props.loading) return
  emit('transfer', {
    recipientUserId: form.value.recipientUserId,
    amount: form.value.amount,
    pin: form.value.pin,
    description: form.value.description,
  })
}

function submitPin() {
  emit('pin-submit', { pin: form.value.pin, pinConfirm: form.value.pinConfirm, currentPin: form.value.currentPin })
}

defineExpose({ resetConfirm: () => { confirmingWithdraw.value = false; confirmingTransfer.value = false } })
</script>

<style scoped>
.field-label { @apply block text-sm font-medium text-gray-700 mb-1; }
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
