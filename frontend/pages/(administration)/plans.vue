<template>
  <div>
    <PageHeader
      title="Gestión de Planes"
      description="Administra los planes de suscripción del sistema"
      :icon="CreditCardIcon"
      :breadcrumb="[{ label: 'Planes' }]"
      :stats="headerStats"
    >
      <template #actions>
        <!-- Tabs en actions -->
        <div class="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
          <button
            v-for="tab in tabs" :key="tab.key"
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === tab.key ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = tab.key as typeof activeTab"
          >{{ tab.label }}</button>
        </div>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openPlanModal()">
          Nuevo Plan
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <PlansGrid
      v-if="activeTab === 'plans'"
      :plans="plans"
      :loading="loading"
      :role-filter="roleFilter"
      :category-filter="categoryFilter"
      :user-categories="userCategories"
      :module-labels="MODULE_LABELS"
      :format-price="formatPrice"
      :format-limit="formatLimit"
      @update:role-filter="roleFilter = $event"
      @update:category-filter="categoryFilter = $event"
      @edit="openPlanModal"
      @delete="confirmDeletePlan"
      @assign="openAssignModal"
    />

    <SubscriptionsTab
      v-if="activeTab === 'subscriptions'"
      :subscriptions="subscriptions"
      :plans="plans"
      :loading="loadingSubs"
      :status-filter="subFilter"
      :plan-filter="planFilter"
      :total-subs="totalSubs"
      :sub-page="subPage"
      :format-price="formatPrice"
      @update:status-filter="subFilter = $event; loadSubscriptions()"
      @update:plan-filter="planFilter = $event; loadSubscriptions()"
      @assign="openAssignModal()"
      @cancel="handleCancelSub"
      @change-page="goSubPage"
    />

    <PendingRequestsTab
      v-if="activeTab === 'requests'"
      :requests="pendingRequests"
      :loading="loadingRequests"
      :processing-id="processingRequest"
      :error="requestActionError"
      :format-price="formatPrice"
      @clear-error="requestActionError = null"
      @approve="handleApproveRequest"
      @reject="handleRejectRequest"
    />

    <PlanFormModal
      :show="showPlanModal"
      :editing="editingPlan"
      :saving="saving"
      :error="formError"
      :user-categories="userCategories"
      :all-modules="ALL_MODULES"
      :module-labels="MODULE_LABELS"
      @close="showPlanModal = false"
      @submit="savePlan"
    />

    <AssignSubscriptionModal
      :show="showAssignModal"
      :plans="plans"
      :preselected-plan-id="assignPreselectedPlanId"
      :assigning="assigning"
      :error="assignError"
      :format-price="formatPrice"
      @close="showAssignModal = false"
      @submit="saveAssign"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { CreditCardIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import PlansGrid from '~/components/admin/plans/PlansGrid.vue'
import SubscriptionsTab from '~/components/admin/plans/SubscriptionsTab.vue'
import PendingRequestsTab from '~/components/admin/plans/PendingRequestsTab.vue'
import PlanFormModal, { type PlanForm } from '~/components/admin/plans/PlanFormModal.vue'
import AssignSubscriptionModal, { type AssignForm } from '~/components/admin/plans/AssignSubscriptionModal.vue'
import { usePlans, type Plan, type Subscription } from '~/composables/commerce/usePlans'
import { useModuleCatalog } from '~/composables/commerce/useModuleCatalog'
import { useToast } from '~/composables/ui/useToast'
import { useConfirm } from '~/composables/ui/useConfirm'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const toast = useToast()
const { confirm } = useConfirm()
const { invalidate: invalidateModules } = useModules()
const { labels: MODULE_LABELS, businessModules, load: loadModuleCatalog } = useModuleCatalog()

// Módulos de NEGOCIO seleccionables al armar un plan — subset dinámico del
// catálogo (SystemModule.isBusinessModule=true), gerenciable por un admin.
const ALL_MODULES = computed(() => businessModules.value.map((m) => m.module))

const {
  plans, subscriptions, stats, loading, loadingSubs, error,
  totalSubs, subPage,
  fetchPlans, createPlan, updatePlan, deletePlan,
  fetchSubscriptions, assignSubscription, cancelSubscription,
  approveSubscription, rejectSubscription,
  fetchStats, formatLimit, formatPrice,
} = usePlans()

const { get } = useApi()

// ─── Categorías de negocio ──────────────────────────────────────────────────────
interface UserCategory { id: string; name: string; icon?: string }
const userCategories = ref<UserCategory[]>([])

async function loadUserCategories() {
  try {
    userCategories.value = await get<UserCategory[]>('/users/categories')
  } catch {
    userCategories.value = []
  }
}

// ─── Estado ───────────────────────────────────────────────────────────────────
const activeTab  = ref<'plans' | 'subscriptions' | 'requests'>('plans')
const subFilter  = ref('')
const planFilter = ref('')

// Filtros de la grilla de planes: por rol/audiencia y por categoría de negocio
const roleFilter     = ref<'all' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'>('all')
const categoryFilter = ref<string>('all')

const tabs = [
  { key: 'plans',         label: 'Planes'         },
  { key: 'subscriptions', label: 'Suscripciones'  },
  { key: 'requests',      label: 'Solicitudes'    },
]

const headerStats = computed(() => [
  { label: 'Total Planes',        value: String(stats.value?.totalPlans  ?? '—') },
  { label: 'Suscripciones',       value: String(stats.value?.activeSubs  ?? '—') },
  { label: 'Total subs',          value: String(stats.value?.totalSubs   ?? '—') },
  { label: 'Ingresos mensuales',  value: stats.value ? formatPrice(stats.value.monthlyRevenue) : '—' },
])

// ─── Plan modal ───────────────────────────────────────────────────────────────
const showPlanModal = ref(false)
const editingPlan   = ref<Plan | null>(null)
const saving        = ref(false)
const formError     = ref<string | null>(null)

function openPlanModal(plan?: Plan) {
  editingPlan.value = plan ?? null
  formError.value   = null
  showPlanModal.value = true
}

async function savePlan(form: PlanForm) {
  saving.value = true; formError.value = null
  try {
    if (editingPlan.value) await updatePlan(editingPlan.value.id, form)
    else await createPlan(form)
    showPlanModal.value = false
    await fetchStats()
  } catch (e: any) { formError.value = getApiErrorMessage(e, 'No se pudo guardar el plan') }
  finally { saving.value = false }
}

async function confirmDeletePlan(plan: Plan) {
  const ok = await confirm({
    title: 'Eliminar plan',
    message: `¿Eliminar el plan "${plan.name}"? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  try { await deletePlan(plan.id); await fetchStats() }
  catch (e: any) { toast.error('Error', getApiErrorMessage(e, 'No se pudo eliminar el plan')) }
}

// ─── Assign modal ─────────────────────────────────────────────────────────────
const showAssignModal = ref(false)
const assigning       = ref(false)
const assignError     = ref<string | null>(null)
const assignPreselectedPlanId = ref<string | null>(null)

function openAssignModal(plan?: Plan) {
  assignError.value = null
  assignPreselectedPlanId.value = plan?.id ?? null
  showAssignModal.value = true
}

async function saveAssign(form: AssignForm) {
  assigning.value = true; assignError.value = null
  try {
    await assignSubscription({ ...form, endAt: form.endAt || undefined })
    showAssignModal.value = false
    invalidateModules(); await fetchStats()
    if (activeTab.value === 'subscriptions') await loadSubscriptions()
  } catch (e: any) { assignError.value = getApiErrorMessage(e, 'No se pudo asignar la suscripción') }
  finally { assigning.value = false }
}

async function handleCancelSub(id: string) {
  const ok = await confirm({ title: 'Cancelar suscripción', message: '¿Cancelar esta suscripción?', confirmText: 'Sí, cancelar', cancelText: 'No', variant: 'danger' })
  if (!ok) return
  try { await cancelSubscription(id); invalidateModules(); await fetchStats() }
  catch (e: any) { toast.error('Error', getApiErrorMessage(e, 'No se pudo cancelar la suscripción')) }
}

async function loadSubscriptions() {
  await fetchSubscriptions({ status: subFilter.value || undefined, planId: planFilter.value || undefined })
}

function goSubPage(page: number) {
  fetchSubscriptions({ status: subFilter.value || undefined, planId: planFilter.value || undefined, page })
}

// ─── Solicitudes pendientes ─────────────────────────────────────────────────────
const pendingRequests = ref<Subscription[]>([])
const loadingRequests = ref(false)
const processingRequest = ref<string | null>(null)
const requestActionError = ref<string | null>(null)

async function loadPendingRequests() {
  loadingRequests.value = true
  try {
    const data = await get<{ subscriptions: Subscription[] }>('/plans/subscriptions?status=PENDING&limit=100')
    pendingRequests.value = data.subscriptions
  } catch (e: any) {
    requestActionError.value = getApiErrorMessage(e, 'No se pudieron cargar las solicitudes')
  } finally {
    loadingRequests.value = false
  }
}

async function handleApproveRequest(sub: Subscription) {
  const ok = await confirm({
    title: 'Aprobar solicitud',
    message: `¿Aprobar la solicitud de ${sub.user?.firstName} ${sub.user?.lastName} para el plan "${sub.plan?.name}"?`,
    confirmText: 'Aprobar',
  })
  if (!ok) return
  processingRequest.value = sub.id
  requestActionError.value = null
  try {
    await approveSubscription(sub.id)
    pendingRequests.value = pendingRequests.value.filter(s => s.id !== sub.id)
    invalidateModules(); await fetchStats()
  } catch (e: any) {
    requestActionError.value = getApiErrorMessage(e, 'No se pudo aprobar la solicitud')
  } finally {
    processingRequest.value = null
  }
}

async function handleRejectRequest(sub: Subscription) {
  const ok = await confirm({
    title: 'Rechazar solicitud',
    message: `¿Rechazar la solicitud de ${sub.user?.firstName} ${sub.user?.lastName} para el plan "${sub.plan?.name}"?`,
    confirmText: 'Rechazar',
    variant: 'danger',
  })
  if (!ok) return
  processingRequest.value = sub.id
  requestActionError.value = null
  try {
    await rejectSubscription(sub.id)
    pendingRequests.value = pendingRequests.value.filter(s => s.id !== sub.id)
    await fetchStats()
  } catch (e: any) {
    requestActionError.value = getApiErrorMessage(e, 'No se pudo rechazar la solicitud')
  } finally {
    processingRequest.value = null
  }
}

watch(activeTab, (tab) => {
  if (tab === 'requests' && pendingRequests.value.length === 0) loadPendingRequests()
})

onMounted(async () => {
  await Promise.all([fetchPlans(), fetchStats(), loadUserCategories(), loadModuleCatalog()])
  await loadSubscriptions()
  await loadPendingRequests()
})
</script>
