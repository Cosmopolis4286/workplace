// Fuente única de verdad para labels/colores/iconos de estado de ServiceRequest.
// Antes duplicado en solicitudes-servicio.vue, ServiceRequestDetailModal.vue y
// MyServiceRequestsWidget.vue (este último ni siquiera tenía CANCELADO).
import { ClockIcon, EyeIcon, PhoneArrowUpRightIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'

export type ServiceRequestStatus = 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO' | 'CANCELADO' | 'RECHAZADO'

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  PENDIENTE: 'Pendiente',
  VISTO: 'Visto',
  CONTACTADO: 'Contactado',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado',
  RECHAZADO: 'Rechazado',
}

export const SERVICE_REQUEST_STATUS_CLASSES: Record<ServiceRequestStatus, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  VISTO: 'bg-gray-100 text-gray-600',
  CONTACTADO: 'bg-blue-100 text-blue-700',
  CERRADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
  RECHAZADO: 'bg-red-100 text-red-700',
}

export const SERVICE_REQUEST_STATUS_ICONS: Record<ServiceRequestStatus, any> = {
  PENDIENTE: ClockIcon,
  VISTO: EyeIcon,
  CONTACTADO: PhoneArrowUpRightIcon,
  CERRADO: CheckCircleIcon,
  CANCELADO: XCircleIcon,
  RECHAZADO: XCircleIcon,
}
