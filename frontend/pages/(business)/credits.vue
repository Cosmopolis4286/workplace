<template>
  <div>
    <PageHeader
      title="Créditos de uso"
      description="Paga con créditos los cargos de la plataforma: cada oportunidad que aceptas y cada servicio que completas."
      :icon="TicketIcon"
      :breadcrumb="[{ label: 'Créditos de uso' }]"
    />

    <div v-if="!features.usageCredits" class="card-premium p-6 text-sm text-gray-600">
      Los créditos de uso todavía no están disponibles.
    </div>

    <template v-else>
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ error }}</div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section class="lg:col-span-2 space-y-6">
          <!-- Saldo -->
          <div class="card-premium p-6">
            <p class="text-sm text-gray-500">Saldo disponible</p>
            <p class="text-3xl font-bold text-gray-900">{{ fmt(summary?.balance.total) }} créditos</p>
            <p class="text-sm text-gray-500 mt-1">
              {{ fmt(summary?.balance.purchased) }} comprados · {{ fmt(summary?.balance.promotional) }} de regalo
            </p>
            <ul v-if="promoLots.length" class="mt-3 text-xs text-amber-700 space-y-0.5">
              <li v-for="l in promoLots" :key="l.id">
                {{ fmt(l.remaining) }} de regalo vencen el {{ fmtDate(l.expiresAt!) }}
              </li>
            </ul>
            <p class="mt-4 text-xs text-gray-500">
              Los créditos solo sirven para pagar cargos de WorkPlace. No se transfieren a otros usuarios ni se cambian por dinero.
              Primero se usan los de regalo.
            </p>
          </div>

          <!-- Comprar -->
          <div class="card-premium p-6 space-y-4">
            <h2 class="text-lg font-bold text-gray-900">Comprar créditos</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                v-for="p in packages"
                :key="p.code"
                type="button"
                class="rounded-xl border-2 p-4 text-left transition-colors"
                :class="selected?.code === p.code ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'"
                @click="selected = p"
              >
                <p class="text-xl font-bold text-gray-900">{{ p.units }} créditos</p>
                <p class="text-sm text-gray-500">${{ p.priceUsd }}</p>
              </button>
            </div>
            <p v-if="!hasPurchases" class="text-xs text-green-700">En tu primera compra te regalamos un 20 % extra (vence a los 90 días).</p>

            <PaymentReportForm
              v-if="selected"
              ref="formRef"
              :accounts="selected.accounts"
              :base-amount="selected.priceUsd"
              base-currency="USD"
              :banks="banks"
              :submitting="submitting"
              :error="payError"
              @submit="submit"
            />
          </div>

          <!-- Movimientos -->
          <div class="card-premium p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-3">Movimientos</h2>
            <p v-if="!summary?.movements.length" class="text-sm text-gray-500">Todavía no hay movimientos.</p>
            <ul v-else class="divide-y divide-gray-100">
              <li v-for="m in summary.movements" :key="m.id" class="py-2 flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm text-gray-800">{{ CREDIT_CONCEPT_LABELS[m.concept] }}</p>
                  <p class="text-xs text-gray-400">{{ fmtDate(m.createdAt) }}</p>
                </div>
                <span class="text-sm font-semibold" :class="Number(m.units) >= 0 ? 'text-green-700' : 'text-gray-800'">
                  {{ Number(m.units) >= 0 ? '+' : '' }}{{ fmt(m.units) }}
                </span>
              </li>
            </ul>
          </div>
        </section>

        <!-- Compras -->
        <aside class="card-premium p-6 h-fit">
          <h2 class="text-lg font-bold text-gray-900 mb-3">Mis compras</h2>
          <p v-if="!summary?.purchases.length" class="text-sm text-gray-500">Sin compras.</p>
          <ul v-else class="space-y-3">
            <li v-for="p in summary.purchases" :key="p.id" class="text-sm">
              <p class="font-semibold text-gray-900">{{ fmt(p.units) }} créditos · ${{ fmt(p.priceUsd) }}</p>
              <p class="text-xs text-gray-500">Ref. {{ p.reference }} · {{ fmtDate(p.createdAt) }}</p>
              <p class="text-xs" :class="p.status === 'REJECTED' ? 'text-red-600' : p.status === 'CONFIRMED' ? 'text-green-700' : 'text-amber-700'">
                {{ CREDIT_PURCHASE_STATUS_LABELS[p.status] }}<span v-if="p.rejectionReason">: {{ p.rejectionReason }}</span>
              </p>
            </li>
          </ul>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { TicketIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import PaymentReportForm, { type PaymentReportPayload } from '~/components/payments/PaymentReportForm.vue'
import { useDirectPayments } from '~/composables/payments/useDirectPayments'
import { useFeatures } from '~/composables/core/useFeatures'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import {
  CREDIT_CONCEPT_LABELS,
  CREDIT_PURCHASE_STATUS_LABELS,
  useUsageCredits,
  type UsageCreditPackage,
  type UsageCreditsSummary,
} from '~/composables/payments/useUsageCredits'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Créditos de uso — WorkPlace' })

const { features, ready } = useFeatures()
const credits = useUsageCredits()
const { banks, loadBanks } = useDirectPayments()

const summary = ref<UsageCreditsSummary | null>(null)
const packages = ref<UsageCreditPackage[]>([])
const selected = ref<UsageCreditPackage | null>(null)
const formRef = ref<InstanceType<typeof PaymentReportForm> | null>(null)
const submitting = ref(false)
const payError = ref<string | null>(null)
const error = ref<string | null>(null)

const promoLots = computed(() =>
  (summary.value?.balance.lots ?? []).filter(l => l.kind === 'PROMOTIONAL' && l.expiresAt),
)
const hasPurchases = computed(() => (summary.value?.purchases ?? []).some(p => p.status !== 'REJECTED'))

const fmt = (v?: string | number | null) => Number(v ?? 0).toFixed(2)
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-VE')

async function load() {
  error.value = null
  try {
    const [mine, pkgs] = await Promise.all([credits.getMine(), credits.getPackages(), loadBanks().catch(() => [])])
    summary.value = mine
    packages.value = pkgs
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar tus créditos')
  }
}

async function submit(payload: PaymentReportPayload) {
  if (!selected.value) return
  submitting.value = true
  payError.value = null
  try {
    await credits.reportPurchase({
      packageCode: selected.value.code,
      platformAccountId: payload.accountId,
      reference: payload.reference,
      paidAt: payload.paidAt,
      payerBankCode: payload.payerBankCode,
    })
    formRef.value?.reset()
    selected.value = null
    await load()
  } catch (e) {
    payError.value = getApiErrorMessage(e, 'No se pudo reportar el pago')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await ready()
  if (features.value.usageCredits) await load()
})
</script>
