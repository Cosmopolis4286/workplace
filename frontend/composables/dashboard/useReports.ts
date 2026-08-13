import { ref } from 'vue'
import { useApi } from '../core/useApi'

export type ReportEntityType = 'CATALOG_ORDER' | 'SERVICE_REQUEST' | 'SERVICE' | 'ORDER' | 'GENERAL'
export type ReportStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'

export interface Report {
  id: string
  entityType: ReportEntityType
  entityId?: string | null
  reason: string
  description?: string | null
  status: ReportStatus
  adminNotes?: string | null
  reporterId?: string
  reporter?: { id: string; username?: string; firstName: string; lastName: string; email: string }
  createdAt: string
}

export function useReports() {
  const { post, get, patch } = useApi()

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

  // ─── Admin (moderación) ───────────────────────────────────────────────────────

  async function fetchAllReports(status?: ReportStatus) {
    const qs = status ? `?status=${status}` : ''
    return get<Report[]>(`/reports/admin${qs}`)
  }

  async function moderateReport(id: string, status: ReportStatus, adminNotes?: string) {
    return patch<Report>(`/reports/admin/${id}`, { status, adminNotes })
  }

  return { sending, error, fileReport, fetchMyReports, fetchAllReports, moderateReport }
}
