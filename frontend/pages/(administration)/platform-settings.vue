<template>
  <div class="space-y-6">
    <PageHeader
      title="Ajustes de la plataforma"
      description="Configura los requisitos de identidad por operación sin desplegar código."
      :icon="AdjustmentsHorizontalIcon"
      :breadcrumb="[{ label: 'Ajustes de la plataforma' }]"
    />

    <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>
    <p v-if="success" class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{{ success }}</p>

    <section class="card-premium space-y-5 p-6">
      <div>
        <h2 class="font-semibold text-gray-900">Identidad y restricciones</h2>
        <p class="mt-1 text-sm text-gray-500">
          Define el nivel mínimo requerido para cada operación. Los mínimos de seguridad del backend no se pueden reducir.
        </p>
        <p v-if="!isSuperAdmin" class="mt-2 text-xs text-amber-700">Puedes consultar la política; solo SUPERADMIN puede modificarla.</p>
      </div>

      <div v-for="item in operations" :key="item.key" class="grid gap-2 border-b border-gray-100 pb-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
        <div>
          <label :for="item.key" class="text-sm font-medium text-gray-800">{{ item.label }}</label>
          <p class="text-xs text-gray-500">Mínimo de seguridad: {{ levelLabel(item.minimum) }}</p>
        </div>
        <select
          :id="item.key"
          v-model="policy.operations[item.key]"
          :disabled="!isSuperAdmin || saving"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
        >
          <option v-for="level in levels.filter(level => rank[level] >= rank[item.minimum])" :key="level" :value="level">
            {{ levelLabel(level) }}
          </option>
        </select>
      </div>

      <div v-if="isSuperAdmin" class="space-y-2">
        <label for="policy-reason" class="text-sm font-medium text-gray-700">Motivo del cambio (obligatorio)</label>
        <textarea id="policy-reason" v-model="reason" rows="3" maxlength="500" class="w-full rounded-lg border border-gray-300 p-3 text-sm" placeholder="Explica por qué se modifica esta política (mínimo 10 caracteres)." />
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-gray-500">Cada modificación queda registrada con actor, fecha, valores anterior/nuevo y motivo.</p>
          <button type="button" class="btn-primary" :disabled="saving || reason.trim().length < 10" @click="savePolicy">
            {{ saving ? 'Guardando…' : 'Guardar política' }}
          </button>
        </div>
      </div>
    </section>

    <section class="card-premium space-y-4 p-6">
      <div>
        <h2 class="font-semibold text-gray-900">Contacto público de tiendas</h2>
        <p class="mt-1 text-sm text-gray-500">Control global de teléfono, correo y WhatsApp en páginas públicas.</p>
      </div>
      <div class="flex items-center justify-between gap-4">
        <span class="text-sm text-gray-700">{{ publicContact ? 'Visible' : 'Oculto' }}</span>
        <button
          type="button"
          role="switch"
          :aria-checked="publicContact"
          :disabled="!isSuperAdmin || saving"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
          :class="publicContact ? 'bg-blue-600' : 'bg-gray-300'"
          @click="togglePublicContact"
        >
          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" :class="publicContact ? 'translate-x-6' : 'translate-x-1'" />
        </button>
      </div>
    </section>

    <section class="card-premium space-y-4 p-6">
      <div>
        <h2 class="font-semibold text-gray-900">Verificación de identidad de compradores</h2>
        <p class="mt-1 text-sm text-gray-500">
          Los compradores pueden pedir y pagar sin verificar su identidad hasta este monto (en dólares; los pagos
          en bolívares se convierten con la tasa del día). Por encima se les pide la verificación. 0 = siempre.
          Vender y retirar dinero siempre la exigen.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">USD</span>
        <input
          v-model.number="buyerThreshold"
          type="number"
          min="0"
          step="1"
          class="input-field w-32"
          :disabled="!isSuperAdmin || saving"
        />
        <button
          type="button"
          class="btn-primary text-sm"
          :disabled="!isSuperAdmin || saving || !(buyerThreshold >= 0)"
          @click="saveThreshold"
        >
          Guardar
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useApi } from '~/composables/core/useApi'
import { useAuth } from '~/composables/auth/useAuth'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Ajustes de la plataforma — WorkPlace' })

type Level = 'PUBLIC' | 'AUTHENTICATED' | 'PHONE_VERIFIED' | 'KYC_APPROVED' | 'ENHANCED_REVIEW'
type Operation = 'marketplace.explore' | 'provider.contact' | 'service.request' | 'catalog.order' | 'service.publish' | 'work.accept' | 'ride.create' | 'ride.accept' | 'wallet.withdraw' | 'delivery.create' | 'job.publish' | 'job.apply' | 'usage-credits.purchase' | 'payment-account.manage'
interface Policy { version: 1; operations: Record<Operation, Level> }

const { get, patch } = useApi()
const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPERADMIN')
const levels: Level[] = ['PUBLIC', 'AUTHENTICATED', 'PHONE_VERIFIED', 'KYC_APPROVED', 'ENHANCED_REVIEW']
const rank: Record<Level, number> = { PUBLIC: 0, AUTHENTICATED: 1, PHONE_VERIFIED: 2, KYC_APPROVED: 3, ENHANCED_REVIEW: 4 }
const operations: Array<{ key: Operation; label: string; minimum: Level }> = [
  { key: 'marketplace.explore', label: 'Explorar el marketplace', minimum: 'PUBLIC' },
  { key: 'provider.contact', label: 'Contactar a un proveedor', minimum: 'PHONE_VERIFIED' },
  { key: 'service.request', label: 'Crear una solicitud formal de servicio', minimum: 'AUTHENTICATED' },
  { key: 'catalog.order', label: 'Crear un pedido de catálogo', minimum: 'AUTHENTICATED' },
  { key: 'service.publish', label: 'Publicar servicios o productos', minimum: 'KYC_APPROVED' },
  { key: 'work.accept', label: 'Aceptar trabajos remunerados', minimum: 'KYC_APPROVED' },
  { key: 'ride.create', label: 'Crear o solicitar corridas', minimum: 'KYC_APPROVED' },
  { key: 'ride.accept', label: 'Aceptar corridas', minimum: 'KYC_APPROVED' },
  { key: 'wallet.withdraw', label: 'Solicitar retiros', minimum: 'KYC_APPROVED' },
  { key: 'delivery.create', label: 'Crear entregas', minimum: 'KYC_APPROVED' },
  { key: 'job.publish', label: 'Publicar vacantes', minimum: 'KYC_APPROVED' },
  { key: 'job.apply', label: 'Postular a empleos', minimum: 'KYC_APPROVED' },
  { key: 'usage-credits.purchase', label: 'Comprar créditos de uso', minimum: 'KYC_APPROVED' },
  { key: 'payment-account.manage', label: 'Registrar o modificar cuentas de cobro', minimum: 'KYC_APPROVED' },
]
const policy = reactive<Policy>({
  version: 1,
  operations: {
    'marketplace.explore': 'PUBLIC',
    'provider.contact': 'PHONE_VERIFIED',
    'service.request': 'AUTHENTICATED',
    'catalog.order': 'AUTHENTICATED',
    'service.publish': 'KYC_APPROVED',
    'work.accept': 'KYC_APPROVED',
    'ride.create': 'KYC_APPROVED',
    'ride.accept': 'KYC_APPROVED',
    'wallet.withdraw': 'KYC_APPROVED',
    'delivery.create': 'KYC_APPROVED',
    'job.publish': 'KYC_APPROVED',
    'job.apply': 'KYC_APPROVED',
    'usage-credits.purchase': 'KYC_APPROVED',
    'payment-account.manage': 'KYC_APPROVED',
  },
})
const publicContact = ref(true)
const reason = ref('')
const buyerThreshold = ref(50)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function levelLabel(level: Level) {
  return ({ PUBLIC: 'Público', AUTHENTICATED: 'Cuenta autenticada', PHONE_VERIFIED: 'Teléfono verificado', KYC_APPROVED: 'KYC aprobado', ENHANCED_REVIEW: 'Revisión reforzada' })[level]
}

async function load() {
  try {
    const settings = await get<Record<string, unknown>>('/platform-settings')
    const stored = settings['identity.kycPolicy'] as Policy | undefined
    if (stored?.version === 1 && stored.operations) Object.assign(policy.operations, stored.operations)
    publicContact.value = settings['store.publicContact'] !== false
    if (typeof settings['kyc.buyerThresholdUsd'] === 'number') {
      buyerThreshold.value = settings['kyc.buyerThresholdUsd'] as number
    }
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar los ajustes')
  }
}

async function savePolicy() {
  if (!isSuperAdmin.value || saving.value || reason.value.trim().length < 10) return
  saving.value = true
  error.value = null
  success.value = null
  try {
    const settings = await patch<Record<string, unknown>>('/platform-settings/identity.kycPolicy', {
      value: { version: 1, operations: { ...policy.operations } },
      reason: reason.value.trim(),
    })
    const saved = settings['identity.kycPolicy'] as Policy
    Object.assign(policy.operations, saved.operations)
    reason.value = ''
    success.value = 'Política KYC guardada y auditada correctamente.'
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo guardar la política KYC')
  } finally {
    saving.value = false
  }
}

async function togglePublicContact() {
  if (!isSuperAdmin.value || saving.value) return
  saving.value = true
  error.value = null
  try {
    const settings = await patch<Record<string, unknown>>('/platform-settings/store.publicContact', {
      value: !publicContact.value,
    })
    publicContact.value = settings['store.publicContact'] !== false
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo guardar el ajuste')
  } finally {
    saving.value = false
  }
}

async function saveThreshold() {
  if (!isSuperAdmin.value || saving.value) return
  saving.value = true
  error.value = null
  try {
    const settings = await patch<Record<string, unknown>>('/platform-settings/kyc.buyerThresholdUsd', {
      value: Math.max(0, Math.round(buyerThreshold.value)),
    })
    buyerThreshold.value = settings['kyc.buyerThresholdUsd'] as number
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo guardar el ajuste')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
