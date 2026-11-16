// Fuente única de verdad para labels/colores/iconos de estado de ServiceRequest.
// Antes duplicado en service-requests.vue, ServiceRequestDetailModal.vue y
// MyServiceRequestsWidget.vue (este último ni siquiera tenía CANCELLED).
import { ClockIcon, EyeIcon, PhoneArrowUpRightIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, WrenchScrewdriverIcon, TruckIcon, PauseIcon, CubeIcon } from '@heroicons/vue/24/outline'

export type ServiceRequestStatus = 'PENDING' | 'SEEN' | 'CONTACTED' | 'SCHEDULED' | 'PREPARING' | 'ON_THE_WAY' | 'IN_PROGRESS' | 'PAUSED' | 'AWAITING_DELIVERY' | 'COMPLETION_PENDING' | 'CLOSED' | 'CANCELLED' | 'REJECTED'

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  PENDING: 'Pendiente',
  SEEN: 'Visto',
  CONTACTED: 'Contactado',
  SCHEDULED: 'Programado',
  PREPARING: 'Preparando',
  ON_THE_WAY: 'En camino',
  IN_PROGRESS: 'En progreso',
  PAUSED: 'Pausado',
  AWAITING_DELIVERY: 'Pendiente de entrega',
  COMPLETION_PENDING: 'Esperando confirmación',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
  REJECTED: 'Rechazado',
}

export const SERVICE_REQUEST_STATUS_CLASSES: Record<ServiceRequestStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SEEN: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-violet-100 text-violet-700',
  ON_THE_WAY: 'bg-cyan-100 text-cyan-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  PAUSED: 'bg-amber-100 text-amber-700',
  AWAITING_DELIVERY: 'bg-orange-100 text-orange-700',
  COMPLETION_PENDING: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-100 text-red-700',
}

export const SERVICE_REQUEST_STATUS_ICONS: Record<ServiceRequestStatus, any> = {
  PENDING: ClockIcon,
  SEEN: EyeIcon,
  CONTACTED: PhoneArrowUpRightIcon,
  SCHEDULED: CalendarIcon,
  PREPARING: WrenchScrewdriverIcon,
  ON_THE_WAY: TruckIcon,
  IN_PROGRESS: WrenchScrewdriverIcon,
  PAUSED: PauseIcon,
  AWAITING_DELIVERY: CubeIcon,
  COMPLETION_PENDING: CheckCircleIcon,
  CLOSED: CheckCircleIcon,
  CANCELLED: XCircleIcon,
  REJECTED: XCircleIcon,
}
