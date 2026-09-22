import { ref } from 'vue'
import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroupBuyingCampaignStatus = 'OPEN' | 'CLOSED' | 'FULFILLED' | 'CANCELLED'

export interface PriceTier {
  minQuantity: number
  unitPrice: number
}

export interface NextTier extends PriceTier {
  unitsToUnlock: number
}

export interface Pledge {
  id: string
  campaignId: string
  commerceId: string
  quantity: number
  cancelled: boolean
  platformFeeRate: number | null
  platformFeeAmount: number | null
  createdAt: string
  updatedAt: string
  commerce?: { id: string; name: string }
}

export interface GroupBuyingCampaign {
  id: string
  organizerId: string
  title: string
  description?: string | null
  unit: string
  currencyCode: string
  priceTiers: PriceTier[]
  deadline: string
  status: GroupBuyingCampaignStatus
  createdAt: string
  updatedAt: string
  organizer?: { id: string; firstName: string; lastName: string }
  pledges?: Pledge[]
  totalQuantity: number
  currentUnitPrice: number | null
  nextTier: NextTier | null
}

export interface CreateCampaignPayload {
  title: string
  description?: string
  unit: string
  currencyCode: string
  priceTiers: PriceTier[]
  deadline: string
}

export interface CreatePledgePayload {
  quantity: number
}

// ─── Global reactive state ────────────────────────────────────────────────────

const campaigns = ref<GroupBuyingCampaign[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// ─── Composable ───────────────────────────────────────────────────────────────

export function useGroupBuying() {
  const { get, post, del } = useApi()

  async function loadCampaigns() {
    loading.value = true
    error.value = null
    try {
      campaigns.value = await get<GroupBuyingCampaign[]>('/group-buying/campaigns')
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function getCampaign(id: string): Promise<GroupBuyingCampaign | null> {
    error.value = null
    try {
      return await get<GroupBuyingCampaign>(`/group-buying/campaigns/${id}`)
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function createCampaign(payload: CreateCampaignPayload): Promise<GroupBuyingCampaign | null> {
    error.value = null
    try {
      const campaign = await post<GroupBuyingCampaign>('/group-buying/campaigns', payload)
      campaigns.value.push(campaign)
      return campaign
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function closeCampaign(id: string): Promise<GroupBuyingCampaign | null> {
    error.value = null
    try {
      const updated = await post<GroupBuyingCampaign>(`/group-buying/campaigns/${id}/close`, {})
      campaigns.value = campaigns.value.filter(c => c.id !== id)
      return updated
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function cancelCampaign(id: string): Promise<boolean> {
    error.value = null
    try {
      await post(`/group-buying/campaigns/${id}/cancel`, {})
      campaigns.value = campaigns.value.filter(c => c.id !== id)
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function pledge(campaignId: string, payload: CreatePledgePayload): Promise<Pledge | null> {
    error.value = null
    try {
      return await post<Pledge>(`/group-buying/campaigns/${campaignId}/pledges`, payload)
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function cancelPledge(campaignId: string): Promise<boolean> {
    error.value = null
    try {
      await del(`/group-buying/campaigns/${campaignId}/pledges`)
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  return {
    // state
    campaigns,
    loading,
    error,
    // actions
    loadCampaigns,
    getCampaign,
    createCampaign,
    closeCampaign,
    cancelCampaign,
    pledge,
    cancelPledge,
  }
}
