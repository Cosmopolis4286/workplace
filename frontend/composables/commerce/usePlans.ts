import { ref, computed } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import { useAuth } from '~/composables/auth/useAuth'

export interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  priceAnnual: number | null
  status: 'ACTIVE' | 'INACTIVE'
  isPopular: boolean
  color: string
  sortOrder: number
  forCommerce: boolean
  forFreelancer: boolean
  forNormal: boolean
  categoryIds: string[]
  maxProducts: number
  maxEmployees: number
  maxBranches: number
  maxOrders: number
  maxStorage: number
  features: string[]
  enabledModules: string[]
  createdAt: string
  updatedAt: string
  _count?: { subscriptions: number }
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'TRIAL' | 'PENDING'
  interval: 'MONTHLY' | 'ANNUAL'
  startAt: string
  endAt: string | null
  trialEnds: string | null
  pricePaid: number
  assignedBy: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string; role: string; avatar?: string; category?: { id: string; name: string; icon?: string } | null }
  plan?: Pick<Plan, 'id' | 'name' | 'price' | 'color'>
}

export interface PlanStats {
  totalPlans: number
  totalSubs: number
  activeSubs: number
  monthlyRevenue: number
  planStats: Array<{ id: string; name: string; color: string; _count: { subscriptions: number } }>
}

export const SUB_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
  TRIAL: 'Prueba',
  PENDING: 'Pendiente',
}

export const SUB_STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  TRIAL: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
}

export const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
}

export interface PlanUsage {
  limits: {
    maxProducts: number; maxEmployees: number; maxBranches: number
    maxOrders: number; planName: string; enabledModules: string[]
  }
  // null para cuentas sin Commerce (ej. FREELANCER) — ver GET /plans/usage en el backend.
  usage: { products: number; employees: number; branches: number; ordersThisMonth: number } | null
}

// ─── Singleton state ──────────────────────────────────────────────────────────

const plans = ref<Plan[]>([])
const subscriptions = ref<Subscription[]>([])
const stats = ref<PlanStats | null>(null)
const mySubscription = ref<Subscription | null>(null)
const pendingSubscription = ref<Subscription | null>(null)
const trialAvailable = ref(false)
const myPlan = ref<Plan | null>(null)
const usage = ref<PlanUsage | null>(null)
const loading = ref(false)
const loadingStats = ref(false)
const loadingSubs = ref(false)
const error = ref<string | null>(null)
const totalSubs = ref(0)
const subPage = ref(1)

export function usePlans() {
  const { apiFetch } = useApi()

  // ─── Plans ────────────────────────────────────────────────────────────────────

  async function fetchPlans(includeInactive = true) {
    loading.value = true
    error.value = null
    try {
      const data = await apiFetch(`/plans?includeInactive=${includeInactive}`)
      plans.value = data
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createPlan(dto: Partial<Plan>) {
    const data = await apiFetch('/plans', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
    plans.value.push(data)
    return data
  }

  async function updatePlan(id: string, dto: Partial<Plan>) {
    const data = await apiFetch(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    })
    const idx = plans.value.findIndex((p: Plan) => p.id === id)
    if (idx >= 0) plans.value[idx] = data
    return data
  }

  async function deletePlan(id: string) {
    await apiFetch(`/plans/${id}`, { method: 'DELETE' })
    plans.value = plans.value.filter((p: Plan) => p.id !== id)
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────────

  async function fetchSubscriptions(options: { status?: string; planId?: string; page?: number } = {}) {
    loadingSubs.value = true
    try {
      const params = new URLSearchParams()
      if (options.status) params.set('status', options.status)
      if (options.planId) params.set('planId', options.planId)
      params.set('page', String(options.page ?? 1))
      params.set('limit', '20')
      const data = await apiFetch(`/plans/subscriptions?${params}`)
      subscriptions.value = data.subscriptions
      totalSubs.value = data.total
      subPage.value = data.page
    } catch (e: any) {
      error.value = e.message
    } finally {
      loadingSubs.value = false
    }
  }

  async function assignSubscription(dto: {
    userId: string
    planId: string
    interval?: string
    status?: string
    endAt?: string
    trialEnds?: string
    pricePaid?: number
    notes?: string
  }) {
    const data = await apiFetch('/plans/subscriptions', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
    subscriptions.value.unshift(data)
    return data
  }

  async function cancelSubscription(id: string) {
    await apiFetch(`/plans/subscriptions/${id}`, { method: 'DELETE' })
    const idx = subscriptions.value.findIndex((s: Subscription) => s.id === id)
    if (idx >= 0) subscriptions.value[idx].status = 'CANCELLED'
  }

  async function approveSubscription(id: string) {
    const data = await apiFetch(`/plans/subscriptions/${id}/approve`, { method: 'PATCH' })
    const idx = subscriptions.value.findIndex((s: Subscription) => s.id === id)
    if (idx >= 0) subscriptions.value[idx] = data.subscription
    return data
  }

  async function rejectSubscription(id: string, reason?: string) {
    const data = await apiFetch(`/plans/subscriptions/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
    const idx = subscriptions.value.findIndex((s: Subscription) => s.id === id)
    if (idx >= 0) subscriptions.value[idx] = data
    return data
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  async function fetchStats() {
    loadingStats.value = true
    try {
      stats.value = await apiFetch('/plans/stats')
    } catch (e: any) {
      error.value = e.message
    } finally {
      loadingStats.value = false
    }
  }

  async function fetchUsage() {
    try {
      const data = await apiFetch('/plans/usage')
      if (data?.limits) usage.value = data
    } catch {
      // non-critical
    }
  }

  // ─── My subscription (user view) ─────────────────────────────────────────────

  async function fetchMySubscription() {
    loading.value = true
    try {
      const data = await apiFetch('/plans/my-subscription')
      mySubscription.value = data.subscription
      pendingSubscription.value = data.pendingSubscription ?? null
      trialAvailable.value = data.trialAvailable ?? false
      myPlan.value = data.subscription?.plan ?? null
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // Prueba gratuita de 7 días, autoservicio y de una sola vez por cuenta
  // (ver PlansService.activateTrial en el backend).
  async function activateTrial(planId: string): Promise<boolean> {
    try {
      await apiFetch('/plans/trial/activate', { method: 'POST', body: JSON.stringify({ planId }) })
      await fetchMySubscription()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  async function fetchPublicPlans() {
    loading.value = true
    try {
      const data = await apiFetch('/plans/public')
      plans.value = data
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const activePlans = computed(() => plans.value.filter((p: Plan) => p.status === 'ACTIVE'))
  const inactivePlans = computed(() => plans.value.filter((p: Plan) => p.status === 'INACTIVE'))

  const { formatPrice, formatLimit } = useMoneyFormat()

  function daysRemaining(endAt: string | null) {
    if (!endAt) return null
    const diff = new Date(endAt).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return {
    plans,
    subscriptions,
    stats,
    mySubscription,
    pendingSubscription,
    trialAvailable,
    myPlan,
    usage,
    loading,
    loadingStats,
    loadingSubs,
    error,
    totalSubs,
    subPage,
    activePlans,
    inactivePlans,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    fetchSubscriptions,
    assignSubscription,
    cancelSubscription,
    approveSubscription,
    rejectSubscription,
    fetchStats,
    fetchMySubscription,
    fetchPublicPlans,
    fetchUsage,
    activateTrial,
    formatLimit,
    formatPrice,
    daysRemaining,
  }
}
