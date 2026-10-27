import { ref } from 'vue'
import { useApi } from '../core/useApi'
import { getApiErrorMessage } from '../core/useApiErrors'

export interface ServiceRequestMessage {
  id: string
  serviceRequestId: string
  senderId: string
  body: string
  readAt?: string | null
  createdAt: string
  sender: { id: string; firstName: string; lastName: string; avatar?: string | null }
}

export function useServiceRequestMessages() {
  const { get, post, patch } = useApi()

  const sending = ref(false)
  const error = ref('')

  async function fetchMessages(serviceRequestId: string) {
    return get<ServiceRequestMessage[]>(`/services/requests/${serviceRequestId}/messages`)
  }

  async function sendMessage(serviceRequestId: string, body: string) {
    sending.value = true
    error.value = ''
    try {
      return await post<ServiceRequestMessage>(`/services/requests/${serviceRequestId}/messages`, { body })
    } catch (e: any) {
      error.value = getApiErrorMessage(e, 'No se pudo enviar el mensaje')
      throw e
    } finally {
      sending.value = false
    }
  }

  async function markRead(serviceRequestId: string) {
    return patch(`/services/requests/${serviceRequestId}/messages/read`, {})
  }

  async function fetchUnreadCount() {
    return get<{ count: number }>('/services/requests/messages/unread-count')
  }

  /** No leídos por solicitud: { [serviceRequestId]: count }. */
  async function fetchUnreadCountByRequest() {
    return get<Record<string, number>>('/services/requests/messages/unread-count-by-request')
  }

  return {
    sending,
    error,
    fetchMessages,
    sendMessage,
    markRead,
    fetchUnreadCount,
    fetchUnreadCountByRequest,
  }
}
