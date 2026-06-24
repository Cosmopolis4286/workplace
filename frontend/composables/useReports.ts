import { ref } from 'vue'
import { useApi } from './useApi'

export type ReportEntityType = 'CATALOG_ORDER' | 'SERVICE_REQUEST' | 'ORDER' | 'GENERAL'

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
  const { post, get } = useApi()

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
      return await post<Report>('/reports', { entityType, entityId, reason, description })
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo enviar el reporte'
      throw e
    } finally {
      sending.value = false
    }
  }

  async function fetchMyReports() {
    return get<Report[]>('/reports/mine')
  }

  return { sending, error, fileReport, fetchMyReports }
}
