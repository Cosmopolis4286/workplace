<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="!submitting && $emit('close')" />
      <form class="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4" novalidate @submit.prevent="onSubmit">
        <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600" :disabled="submitting" @click="$emit('close')">
          <XMarkIcon class="h-5 w-5" />
        </button>
        <div class="flex items-start gap-3">
          <div class="p-2 rounded-xl bg-red-100 text-red-700"><ArrowUpTrayIcon class="h-5 w-5" /></div>
          <div>
            <h3 class="font-bold text-gray-900">Retirar a mi banco</h3>
            <p class="text-xs text-gray-500">Disponible: {{ formatPaymentAmount(balance, 'USD') }}. Un administrador hará la transferencia.</p>
          </div>
        </div>

        <div>
          <label class="field-label">Monto (USD) *</label>
          <div class="flex gap-2">
            <input v-model.number="amount" type="number" min="1" step="0.01" :max="balance" class="input-field" placeholder="0.00" />
            <button type="button" class="btn-secondary text-xs whitespace-nowrap" @click="amount = Math.floor(balance * 100) / 100">Todo</button>
          </div>
        </div>

        <!-- Destino -->
        <div>
          <label class="field-label">¿Dónde lo recibes? *</label>
          <div v-if="loadingAccounts" class="skeleton h-12 rounded-xl" />
          <div v-else class="space-y-2">
            <label
              v-for="acc in accounts"
              :key="acc.id"
              class="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm"
              :class="accountId === acc.id ? 'border-emerald-500 bg-emerald-50/40' : 'border-gray-200'"
            >
              <input v-model="accountId" type="radio" :value="acc.id" class="text-emerald-600" />
              <span class="min-w-0 truncate">
                <span class="font-semibold">{{ DIRECT_PAYMENT_METHOD_LABELS[acc.method] }}</span>
                <span class="text-gray-500"> · {{ acc.bankName ?? acc.email }} · {{ accountDetail(acc) }}</span>
              </span>
            </label>
            <label
              class="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm"
              :class="accountId === NEW ? 'border-emerald-500 bg-emerald-50/40' : 'border-gray-200'"
            >
              <input v-model="accountId" type="radio" :value="NEW" class="text-emerald-600" />
              <span class="font-semibold">Otra cuenta</span>
            </label>
          </div>
        </div>

        <div v-if="accountId === NEW" class="p-4 bg-gray-50 rounded-xl space-y-3">
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="(label, method) in DIRECT_PAYMENT_METHOD_LABELS"
              :key="method"
              type="button"
              class="py-2 rounded-lg border-2 text-xs font-semibold"
              :class="dest.method === method ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 bg-white'"
              @click="dest.method = method"
            >
              {{ label }}
            </button>
          </div>
          <select v-if="dest.method !== 'ZELLE'" v-model="dest.bankCode" class="input-field bg-white">
            <option value="" disabled>Banco</option>
            <option v-for="bank in banks" :key="bank.code" :value="bank.code">{{ bank.code }} · {{ bank.name }}</option>
          </select>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="dest.holderName" type="text" maxlength="100" class="input-field" placeholder="Titular" />
            <input v-model="dest.holderDocument" type="text" maxlength="20" class="input-field" placeholder="Cédula / RIF (V-12345678)" />
          </div>
          <input v-if="dest.method === 'PAGO_MOVIL'" v-model="dest.phone" type="tel" inputmode="numeric" maxlength="16" class="input-field" placeholder="Teléfono (04141234567)" />
          <input v-else-if="dest.method === 'BANK_TRANSFER'" v-model="dest.accountNumber" type="text" inputmode="numeric" maxlength="30" class="input-field font-mono" placeholder="Cuenta de 20 dígitos" />
          <input v-else v-model="dest.email" type="email" maxlength="120" class="input-field" placeholder="Correo de Zelle" />
        </div>

        <p class="text-xs text-gray-500">
          {{ isZelle ? 'Zelle se paga en dólares.' : 'Pago móvil y transferencias se pagan en bolívares a la tasa del día de la solicitud.' }}
          El monto sale de tu billetera ahora; si el retiro se rechaza, vuelve completo.
        </p>

        <div>
          <label class="field-label">PIN de la billetera *</label>
          <input v-model="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" class="input-field font-mono tracking-widest" placeholder="••••••" />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary text-sm" :disabled="submitting" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="btn-primary text-sm" :disabled="submitting">{{ submitting ? 'Enviando…' : 'Solicitar retiro' }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import {
  useDirectPayments,
  DIRECT_PAYMENT_METHOD_LABELS,
  formatPaymentAmount,
  type DirectPaymentMethod,
  type SellerPaymentAccount,
} from '~/composables/payments/useDirectPayments'
import { useWalletWithdrawals, type CreateWithdrawalPayload } from '~/composables/wallets/useWalletWithdrawals'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const props = defineProps<{ balance: number }>()
const emit = defineEmits<{ close: []; created: [] }>()

const NEW = '__new__'
const { banks, loadBanks, listMyAccounts } = useDirectPayments()
const { create } = useWalletWithdrawals()

const accounts = ref<SellerPaymentAccount[]>([])
const loadingAccounts = ref(true)
const accountId = ref<string>(NEW)
const amount = ref<number | null>(null)
const pin = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)
const dest = ref({
  method: 'PAGO_MOVIL' as DirectPaymentMethod,
  bankCode: '',
  holderName: '',
  holderDocument: '',
  phone: '',
  accountNumber: '',
  email: '',
})

const isZelle = computed(() => {
  if (accountId.value === NEW) return dest.value.method === 'ZELLE'
  return accounts.value.find(a => a.id === accountId.value)?.method === 'ZELLE'
})

function accountDetail(acc: SellerPaymentAccount) {
  if (acc.method === 'PAGO_MOVIL') return acc.phone
  if (acc.method === 'ZELLE') return ''
  return acc.accountNumber ? `••••${acc.accountNumber.slice(-4)}` : ''
}

async function onSubmit() {
  error.value = null
  const value = Number(amount.value)
  if (!value || value < 1) return (error.value = 'El monto mínimo es $1.00')
  if (value > props.balance) return (error.value = 'El monto supera tu saldo disponible')
  if (!/^\d{6}$/.test(pin.value)) return (error.value = 'Ingresa tu PIN de 6 dígitos')

  const payload: CreateWithdrawalPayload = { amount: Math.round(value * 100) / 100, pin: pin.value }
  if (accountId.value !== NEW) payload.accountId = accountId.value
  else {
    const d = dest.value
    payload.destination = { method: d.method, holderName: d.holderName, holderDocument: d.holderDocument }
    if (d.method === 'ZELLE') payload.destination.email = d.email
    else {
      payload.destination.bankCode = d.bankCode
      if (d.method === 'PAGO_MOVIL') payload.destination.phone = d.phone
      else payload.destination.accountNumber = d.accountNumber
    }
  }

  submitting.value = true
  try {
    await create(payload)
    emit('created')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo solicitar el retiro')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const [mine] = await Promise.all([listMyAccounts(), loadBanks().catch(() => [])])
    accounts.value = mine.filter(a => a.isActive)
    if (accounts.value[0]) accountId.value = accounts.value[0].id
  } catch {
    accounts.value = []
  } finally {
    loadingAccounts.value = false
  }
})
</script>

<style scoped>
.field-label { @apply block text-sm font-medium text-gray-700 mb-1; }
</style>
