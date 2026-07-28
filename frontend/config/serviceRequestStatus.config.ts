// Fuente única de verdad para labels/colores/iconos de estado de ServiceRequest.
// Antes duplicado en service-requests.vue, ServiceRequestDetailModal.vue y
// MyServiceRequestsWidget.vue (este último ni siquiera tenía CANCELLED).
import { ClockIcon, EyeIcon, PhoneArrowUpRightIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'

export type ServiceRequestStatus = 'PENDING' | 'SEEN' | 'CONTACTED' | 'CLOSED' | 'CANCELLED' | 'REJECTED'

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  PENDING: 'Pendiente',
  SEEN: 'Visto',
  CONTACTED: 'Contactado',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
  REJECTED: 'Rechazado',
}

export const SERVICE_REQUEST_STATUS_CLASSES: Record<ServiceRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SEEN: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-100 text-red-700',
}

export const SERVICE_REQUEST_STATUS_ICONS: Record<ServiceRequestStatus, any> = {
  PENDING: ClockIcon,
  SEEN: EyeIcon,
  CONTACTED: PhoneArrowUpRightIcon,
  CLOSED: CheckCircleIcon,
  CANCELLED: XCircleIcon,
  REJECTED: XCircleIcon,
}
