<template>
  <div class="card-premium p-6">
    <div class="flex items-start justify-between gap-3 mb-5">
      <div class="flex items-center">
        <div class="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg mr-3">
          <BanknotesIcon class="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 class="text-xl font-bold text-gray-900">{{ copy.title }}</h3>
          <p class="text-xs text-gray-500">{{ copy.subtitle }}</p>
        </div>
      </div>
      <button
        v-if="!showForm && (scope === 'platform' || activeCount < MAX_ACTIVE)"
        type="button"
        class="btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0"
        @click="openForm"
      >
        <PlusIcon class="h-4 w-4" /> Agregar
      </button>
    </div>

    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between gap-2">
      <span>{{ error }}</span>
      <button @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- Formulario -->
    <form v-if="showForm" class="mb-5 p-4 bg-gray-50 rounded-xl space-y-3" novalidate @submit.prevent="save">
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(label, method) in DIRECT_PAYMENT_METHOD_LABELS"
          :key="method"
          type="button"
          class="py-2 rounded-lg border-2 text-xs font-semibold transition-all"
          :class="form.method === method ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 bg-white'"
          @click="form.method = method"
        >
          {{ label }}
        </button>
      </div>

      <div v-if="form.method !== 'ZELLE'">
        <label class="block text-xs font-medium text-gray-700 mb-1">Banco *</label>
        <select v-model="form.bankCode" class="input-field bg-white">
          <option value="" disabled>Selecciona tu banco</option>
          <option v-for="bank in banks" :key="bank.code" :value="bank.code">{{ bank.code }} · {{ bank.name }}</option>
        </select>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Titular *</label>
          <input v-model="form.holderName" type="text" maxlength="100" class="input-field" placeholder="Nombre o razón social" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Cédula / RIF *</label>
          <input v-model="form.holderDocument" type="text" maxlength="20" class="input-field" placeholder="V-12345678" />
        </div>
      </div>

      <div v-if="form.method === 'PAGO_MOVIL'">
        <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono *</label>
        <input v-model="form.phone" type="tel" inputmode="numeric" maxlength="16" class="input-field" placeholder="04141234567" />
      </div>
      <div v-else-if="form.method === 'BANK_TRANSFER'">
        <label class="block text-xs font-medium text-gray-700 mb-1">Número de cuenta (20 dígitos) *</label>
        <input v-model="form.accountNumber" type="text" inputmode="numeric" maxlength="30" class="input-field font-mono" placeholder="0191 0000 00 0000000000" />
        <p v-if="form.bankCode && accountDigits && !accountDigits.startsWith(form.bankCode)" class="mt-1 text-xs text-amber-600">
          Las cuentas de este banco empiezan por {{ form.bankCode }}.
        </p>
      </div>
      <div v-else>
        <label class="block text-xs font-medium text-gray-700 mb-1">Correo de Zelle *</label>
        <input v-model="form.email" type="email" maxlength="120" class="input-field" placeholder="tucorreo@ejemplo.com" />
      </div>

      <p class="text-xs text-gray-400">
        {{ form.method === 'ZELLE' ? 'Se cobra en dólares.' : 'Se cobra en bolívares, a la tasa BCV del día del pedido.' }}
        {{ copy.holderHint }}
      </p>

      <div class="flex gap-2 justify-end">
        <button type="button" class="btn-secondary text-sm" :disabled="saving" @click="showForm = false">Cancelar</button>
        <button type="submit" class="btn-primary text-sm" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar cuenta' }}</button>
      </div>
    </form>

    <!-- Lista -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="skeleton h-16 rounded-xl" />
    </div>
    <div v-else-if="accounts.length === 0 && !showForm" class="text-center py-6">
      <p class="text-sm text-gray-600 font-medium">{{ copy.emptyTitle }}</p>
      <p class="text-xs text-gray-400 mt-1">{{ copy.emptyHint }}</p>
    </div>
    <ul v-else class="space-y-2">
      <li
        v-for="acc in accounts"
        :key="acc.id"
        class="flex items-center justify-between gap-3 p-3 rounded-xl border"
        :class="acc.isActive ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50 opacity-70'"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">
            {{ DIRECT_PAYMENT_METHOD_LABELS[acc.method] }}
            <span class="text-gray-400 font-normal">· {{ acc.bankName ?? acc.currency }}</span>
          </p>
          <p class="text-xs text-gray-500 truncate">
            {{ acc.holderName }} · {{ acc.holderDocument }} · {{ accountDetail(acc) }}
          </p>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            class="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-100"
            :class="acc.isActive ? 'text-gray-500' : 'text-emerald-600'"
            :disabled="busyId === acc.id"
            @click="toggle(acc)"
          >
            {{ acc.isActive ? 'Pausar' : 'Activar' }}
          </button>
          <button
            type="button"
            class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
            :disabled="busyId === acc.id"
            aria-label="Eliminar cuenta"
            @click="remove(acc)"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BanknotesIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import {
  useDirectPayments,
  DIRECT_PAYMENT_METHOD_LABELS,
  type SellerPaymentAccount,
  type DirectPaymentMethod,
} from '~/composables/payments/useDirectPayments'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useSellerBilling } from '~/composables/payments/useSellerBilling'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

// scope="platform": cuentas donde la PLATAFORMA cobra los estados de cuenta
// de los vendedores (admin). Mismo formulario y validaciones, otros endpoints.
const props = withDefaults(defineProps<{ scope?: 'seller' | 'platform' | 'payout' }>(), { scope: 'seller' })
const emit = defineEmits<{ saved: [message: string] }>()

const COPY = {
  seller: {
    title: 'Cuentas de cobro',
    subtitle: 'Tus clientes te pagan directo a estas cuentas y reportan la referencia',
    holderHint: 'El titular debe ser tuyo o de tu negocio.',
    emptyTitle: 'Todavía no tienes cuentas de cobro',
    emptyHint: 'Sin una cuenta, tus clientes no pueden pagarte desde la app.',
  },
  payout: {
    title: 'Cuentas para retiros',
    subtitle: 'Cuentas propias donde recibes el dinero que retiras de tu billetera',
    holderHint: 'El titular debe ser tuyo (mismo documento de tu verificación de identidad).',
    emptyTitle: 'Todavía no tienes cuentas para retiros',
    emptyHint: 'Agrega una para poder retirar saldo de tu billetera.',
  },
  platform: {
    title: 'Cuentas de cobro de la plataforma',
    subtitle: 'Donde los vendedores pagan su estado de cuenta semanal',
    holderHint: 'Debe ser una cuenta de la empresa que opera WorkPlace.',
    emptyTitle: 'No hay cuentas de cobro de la plataforma',
    emptyHint: 'Sin una cuenta activa, los vendedores no pueden pagar su estado de cuenta.',
  },
}
const copy = computed(() => COPY[props.scope])

// Mismo límite que SellerPaymentAccountsService (solo cuentas del vendedor).
const MAX_ACTIVE = 5

const direct = useDirectPayments()
const billing = useSellerBilling()
const { banks, loadBanks } = direct
const api = computed(() =>
  props.scope === 'platform'
    ? {
        list: billing.listCollectionAccounts,
        create: billing.createCollectionAccount,
        setActive: billing.setCollectionAccountActive,
        remove: billing.removeCollectionAccount,
      }
    : {
        list: direct.listMyAccounts,
        create: direct.createAccount,
        setActive: direct.setAccountActive,
        remove: direct.removeAccount,
      },
)
const { confirm } = useConfirm()

const accounts = ref<SellerPaymentAccount[]>([])
const loading = ref(true)
const saving = ref(false)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)
const showForm = ref(false)

const emptyForm = () => ({
  method: 'PAGO_MOVIL' as DirectPaymentMethod,
  bankCode: '',
  holderName: '',
  holderDocument: '',
  phone: '',
  accountNumber: '',
  email: '',
})
const form = ref(emptyForm())

const activeCount = computed(() => accounts.value.filter(a => a.isActive).length)
const accountDigits = computed(() => form.value.accountNumber.replace(/\D/g, ''))

function accountDetail(acc: SellerPaymentAccount) {
  if (acc.method === 'PAGO_MOVIL') return acc.phone
  if (acc.method === 'ZELLE') return acc.email
  return acc.accountNumber ? `••••${acc.accountNumber.slice(-4)}` : ''
}

async function load() {
  loading.value = true
  try {
    accounts.value = await api.value.list()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar tus cuentas de cobro')
  } finally {
    loading.value = false
  }
}

async function openForm() {
  form.value = emptyForm()
  showForm.value = true
  try {
    await loadBanks()
  } catch {
    error.value = 'No se pudo cargar la lista de bancos'
  }
}

async function save() {
  error.value = null
  const f = form.value
  const payload: Partial<SellerPaymentAccount> = {
    method: f.method,
    holderName: f.holderName,
    holderDocument: f.holderDocument,
  }
  if (f.method === 'ZELLE') payload.email = f.email
  else {
    payload.bankCode = f.bankCode
    if (f.method === 'PAGO_MOVIL') payload.phone = f.phone
    else payload.accountNumber = f.accountNumber
  }
  saving.value = true
  try {
    await api.value.create(payload)
    showForm.value = false
    await load()
    emit('saved', 'Cuenta de cobro guardada')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo guardar la cuenta')
  } finally {
    saving.value = false
  }
}

async function toggle(acc: SellerPaymentAccount) {
  busyId.value = acc.id
  error.value = null
  try {
    await api.value.setActive(acc.id, !acc.isActive)
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo actualizar la cuenta')
  } finally {
    busyId.value = null
  }
}

async function remove(acc: SellerPaymentAccount) {
  await confirm({
    title: 'Eliminar cuenta de cobro',
    message: 'Esta cuenta dejará de mostrarse para pagar. Si ya recibió pagos, quedará pausada para conservar el historial.',
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        const res = await api.value.remove(acc.id)
        await load()
        emit('saved', res.deleted ? 'Cuenta eliminada' : 'La cuenta tiene pagos registrados: quedó pausada')
      } catch (e) {
        return getApiErrorMessage(e, 'No se pudo eliminar la cuenta')
      }
    },
  })
}

onMounted(load)
</script>
