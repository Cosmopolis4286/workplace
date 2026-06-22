import { ref } from 'vue'
import { useAuth } from './useAuth'

export type ReportEntityType = 'CATALOG_ORDER' | 'SERVICE_REQUEST' | 'GENERAL'

export interface Report {
  id: string
  entityType: ReportEntityType
  entityId?: string | null
  reason: string
  description?: string | null
  status: 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO' | 'DESCARTADO'
  adminNotes?: string | null
  createdAt: string
}

export function useReports() {
  const { getHeaders } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  const sending = ref(false)
  const error = ref('')

  async function fileReport(
    entityType: ReportEntityType,
    reason: string,
    description?: string,
    entityId?: string,
  ) {
    sending.value = true
    error.value = ''
    try {
      return await $fetch<Report>(`${apiUrl}/reports`, {
        method: 'POST',
        headers: getHeaders(),
        body: { entityType, entityId, reason, description },
      })
    } catch (e: any) {
      error.value = e?.data?.message ?? 'No se pudo enviar el reporte'
      throw e
    } finally {
      sending.value = false
    }
  }

  async function fetchMyReports() {
    return $fetch<Report[]>(`${apiUrl}/reports/mine`, { headers: getHeaders() })
  }

  return { sending, error, fileReport, fetchMyReports }
}
