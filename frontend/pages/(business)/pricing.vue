<template>
  <NuxtLayout :name="layout">
  <div>
    <PageHeader
      title="Planes y Precios"
      description="Elige el plan perfecto para tu negocio. Empieza gratis y escala cuando lo necesites."
      :icon="CreditCardIcon"
      :breadcrumb="[{ label: 'Planes y Precios' }]"
    >
      <template #actions>
        <!-- Toggle mensual / anual -->
        <div class="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm">
          <button
            :class="['px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200', !annual ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700']"
            @click="annual = false"
          >Mensual</button>
          <button
            :class="['px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2', annual ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700']"
            @click="annual = true"
          >
            Anual
            <span class="bg-green-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">-20%</span>
          </button>
        </div>
      </template>
    </PageHeader>

    <CurrentSubscriptionBanner
      v-if="canChangePlan"
      :my-subscription="mySubscription"
      :my-plan="myPlan"
      :days-remaining="daysRemaining"
      :format-date-long="formatDateLong"
    />

    <PendingSubscriptionBanner
      v-if="canChangePlan && pendingSubscription"
      :pending-subscription="pendingSubscription"
    />

    <!-- Ya existe una solicitud de perfil (Profesional/Negocio) en revisión
         vía /profile → "Mis perfiles" — mismo destino que este wizard, no
         tiene sentido dejar abrir una segunda solicitud en paralelo. -->
    <PendingProfileBanner
      v-if="isNormalUser && pendingProfileActivation && wizardStep !== 3"
      :pending-profile="pendingProfileActivation"
    />

    <UpgradeWizard
      v-if="isNormalUser && (!pendingProfileActivation || wizardStep === 3)"
      :plans="plans"
      :loading-plans="loadingPlans"
      :annual="annual"
      @update:step="wizardStep = $event"
    />

    <PlanCardsGrid
      v-else
      :plans="plans"
      :loading="loading"
      :error="error"
      :change-plan-error="changePlanError"
      :annual="annual"
      :my-plan-id="myPlan?.id"
      :can-change-plan="canChangePlan"
      :is-authenticated="isAuthenticated"
      :changing-plan="changingPlan"
      @change-plan="changePlan"
    />

    <PlanComparisonTable v-if="!isNormalUser && !loading && plans.length > 0" :plans="plans" />

    <PricingFaq />

    <!-- Footer CTA -->
    <section class="mt-8 bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl py-12 px-6 text-center text-white shadow-xl">
      <h3 class="text-2xl font-black mb-2">¿Tienes preguntas?</h3>
      <p class="text-red-100 mb-6">Nuestro equipo está listo para ayudarte a elegir el plan ideal para tu negocio.</p>
      <a
        href="mailto:soporte@workplacemanager.com"
        class="inline-flex items-center gap-2.5 bg-white text-red-600 hover:bg-red-50 px-7 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg shadow-red-900/20"
      >
        <EnvelopeIcon class="w-4 h-4" />
        Contáctanos
      </a>
    </section>

  </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { CreditCardIcon, EnvelopeIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import PageHeader from '~/components/ui/PageHeader.vue'
import CurrentSubscriptionBanner from '~/components/pricing/CurrentSubscriptionBanner.vue'
import PendingSubscriptionBanner from '~/components/pricing/PendingSubscriptionBanner.vue'
import PendingProfileBanner from '~/components/pricing/PendingProfileBanner.vue'
import UpgradeWizard, { type PricingPlan } from '~/components/pricing/UpgradeWizard.vue'
import PlanCardsGrid from '~/components/pricing/PlanCardsGrid.vue'
import PlanComparisonTable from '~/components/pricing/PlanComparisonTable.vue'
import PricingFaq from '~/components/pricing/PricingFaq.vue'
import { usePlans } from '~/composables/commerce/usePlans'
import { useProfileActivations } from '~/composables/users/useProfileActivations'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { useMoneyFormat } from '~/composables/core/useMoneyFormat'

// Página híbrida: visitantes anónimos la ven como landing pública (layout
// 'public'), usuarios con sesión la ven dentro del backoffice (layout
// 'default', con sidebar) para poder cambiar de plan. Mismo patrón que
// pages/p/[username].vue.
definePageMeta({ layout: false })

const { confirm } = useConfirm()
const { formatDateLong } = useDateFormat()
const { formatPrice } = useMoneyFormat()

const { user, isAuthenticated, ensureSessionVerified } = useAuth()
const { mySubscription, pendingSubscription, myPlan, fetchMySubscription, daysRemaining } = usePlans()
const { mine: myProfileActivations, fetchMine: fetchMyProfileActivations } = useProfileActivations()

// La sesión cacheada podría estar caducada (token expirado); confirmamos
// contra el servidor antes de decidir qué layout/contenido mostrar.
await ensureSessionVerified()
const layout = computed(() => isAuthenticated.value ? 'default' : 'public')

// ─── Estado ───────────────────────────────────────────────────────────────────
const plans        = ref<PricingPlan[]>([])
const loading      = ref(false)
const loadingPlans = ref(false)
const error        = ref<string | null>(null)
const annual       = ref(false)
const changingPlan   = ref<string | null>(null)
const changePlanError = ref('')

// Refleja el paso actual del UpgradeWizard, para decidir si mostrar el banner
// de "solicitud pendiente" (se oculta mientras el wizard muestra su paso 3
// de confirmación, aunque ya exista una solicitud pendiente).
const wizardStep = ref(0)

const isNormalUser       = computed(() => isAuthenticated.value && user.value?.role === 'NORMAL')
const canChangePlan      = computed(() => isAuthenticated.value && user.value?.role === 'PROFESIONAL')

// Solicitud de "convertirme en Profesional/Negocio" ya en curso — mismo
// destino que UpgradeWizard, vía /profile-activations (ver PendingProfileBanner).
const pendingProfileActivation = computed(() =>
  myProfileActivations.value.find(p => (p.type === 'PROFESSIONAL' || p.type === 'BUSINESS') && p.status === 'PENDING') ?? null
)

function currentPrice(plan: PricingPlan): number {
  if (annual.value && plan.priceAnnual) return plan.priceAnnual
  return plan.priceMonthly ?? plan.price ?? 0
}

// ─── Carga de datos ───────────────────────────────────────────────────────────
async function loadPlans() {
  loading.value = true; loadingPlans.value = true
  try {
    const { get } = useApi()
    const data = await get('/plans/public')
    plans.value = Array.isArray(data) ? data : (data as any)?.data ?? []
  } catch (e: any) {
    error.value = getApiErrorMessage(e, 'Error cargando planes')
  } finally { loading.value = false; loadingPlans.value = false }
}

// ─── Cambio de plan (COMMERCE / FREELANCER) ───────────────────────────────────
// Un plan gratuito se activa de inmediato. Un plan pago queda pendiente de
// aprobación admin (ver PlansService.selfSubscribe) — el pago no se verifica
// automáticamente, así que no puede activarse solo con este click.
async function changePlan(plan: PricingPlan) {
  changePlanError.value = ''
  const isPaid = currentPrice(plan) > 0
  const priceLabel = isPaid ? formatPrice(currentPrice(plan)) + (annual.value ? '/año' : '/mes') : 'Gratis'
  const confirmMsg = isPaid
    ? `¿Solicitar el plan "${plan.name}" (${priceLabel})? Un administrador revisará tu solicitud antes de activarlo.`
    : `¿Cambiar al plan "${plan.name}" (${priceLabel})? Tu suscripción actual será reemplazada.`
  const ok = await confirm({ title: isPaid ? 'Solicitar plan' : 'Cambiar plan', message: confirmMsg })
  if (!ok) return

  changingPlan.value = plan.id
  try {
    const { post } = useApi()
    await post('/plans/self-subscribe', {
      planId: plan.id,
      interval: annual.value ? 'ANNUAL' : 'MONTHLY',
    })
    await fetchMySubscription()
  } catch (e: any) {
    changePlanError.value = getApiErrorMessage(e, 'Error al cambiar de plan. Intenta de nuevo.')
  } finally {
    changingPlan.value = null
  }
}

onMounted(async () => {
  await loadPlans()
  if (canChangePlan.value) fetchMySubscription()
  if (isNormalUser.value) fetchMyProfileActivations()
})
</script>
