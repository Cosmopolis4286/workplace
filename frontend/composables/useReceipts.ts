import { ref } from 'vue'
import { useApi } from './useApi'

export interface Receipt {
  id: string
  receiptNumber: string
  orderId: string
  commerceId: string
  commerceName: string
  commerceAddress?: string
  commercePhone?: string
  issuedAt: string
}

export function useReceipts() {
  const { get, post } = useApi()
  // Per-instance state — not module-level, so two components don't share loading/error
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function getByOrder(orderId: string): Promise<Receipt | null> {
    try {
      return await get<Receipt>(`/receipts/by-order/${orderId}`)
    } catch {
      return null
    }
  }

  async function create(orderId: string): Promise<Receipt | null> {
    loading.value = true
    error.value = null
    try {
      return await post<Receipt>('/receipts', { orderId })
    } catch (e: any) {
      error.value = e?.message ?? 'Error al generar el comprobante'
      return null
    } finally {
      loading.value = false
    }
  }

  async function downloadPdf(receipt: Receipt) {
    loading.value = true
    error.value = null
    try {
      const blob = await get<Blob>(`/receipts/${receipt.id}/pdf`, { parseAs: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${receipt.receiptNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      error.value = e?.message ?? 'Error al descargar el comprobante'
    } finally {
      loading.value = false
    }
  }

  async function getOrCreateAndDownload(orderId: string): Promise<boolean> {
    let receipt = await getByOrder(orderId)
    if (!receipt) receipt = await create(orderId)
    if (!receipt) return false
    await downloadPdf(receipt)
    return true
  }

  return {
    loading,
    error,
    getByOrder,
    create,
    downloadPdf,
    getOrCreateAndDownload,
  }
}
