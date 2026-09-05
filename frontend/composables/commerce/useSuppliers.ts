import { ref } from 'vue'
import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupplierStatus = 'ACTIVE' | 'INACTIVE'

export interface Supplier {
  id: string
  name: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  category?: string | null
  notes?: string | null
  status: SupplierStatus
  commerceId: string
  createdAt: string
  updatedAt: string
}

export interface CreateSupplierPayload {
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  category?: string
  notes?: string
  status?: SupplierStatus
}

export interface CreateSupplierQuotePayload {
  productId: string
  price: number
  currencyCode: string
  leadTimeDays?: number
  available?: boolean
  notes?: string
}

export interface SupplierQuoteComparisonEntry {
  supplierId: string
  supplierName: string
  priceUsd: number
  leadTimeDays: number | null
  available: boolean
  quotedAt: string
  priceChangePct: number | null
  priceChangeLookbackDays: number | null
}

export interface SupplierQuoteComparison {
  productId: string
  productName: string
  quotes: SupplierQuoteComparisonEntry[]
  cheapestSupplierId: string | null
}

// ─── Global reactive state ────────────────────────────────────────────────────

const suppliers = ref<Supplier[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// ─── Composable ───────────────────────────────────────────────────────────────

export function useSuppliers() {
  const { get, post, put, del } = useApi()

  async function loadSuppliers() {
    loading.value = true
    error.value = null
    try {
      suppliers.value = await get<Supplier[]>('/suppliers')
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function createSupplier(payload: CreateSupplierPayload): Promise<Supplier | null> {
    error.value = null
    try {
      const supplier = await post<Supplier>('/suppliers', payload)
      suppliers.value.push(supplier)
      return supplier
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function updateSupplier(id: string, payload: Partial<CreateSupplierPayload>): Promise<Supplier | null> {
    error.value = null
    try {
      const updated = await put<Supplier>(`/suppliers/${id}`, payload)
      const idx = suppliers.value.findIndex(s => s.id === id)
      if (idx !== -1) suppliers.value[idx] = updated
      return updated
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function deleteSupplier(id: string): Promise<boolean> {
    error.value = null
    try {
      await del(`/suppliers/${id}`)
      suppliers.value = suppliers.value.filter(s => s.id !== id)
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function createQuote(supplierId: string, payload: CreateSupplierQuotePayload) {
    try {
      return await post(`/suppliers/${supplierId}/quotes`, payload)
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function compareForProduct(productId: string): Promise<SupplierQuoteComparison | null> {
    try {
      return await get<SupplierQuoteComparison>(`/suppliers/compare/${productId}`)
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  return {
    // state
    suppliers,
    loading,
    error,
    // actions
    loadSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    createQuote,
    compareForProduct,
  }
}
