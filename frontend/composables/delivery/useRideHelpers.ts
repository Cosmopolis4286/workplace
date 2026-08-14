const VEHICLE_EMOJI: Record<string, string> = { MOTORCYCLE: '🏍️', CAR: '🚗', PICKUP_TRUCK: '🛻', TRUCK: '🚚' }
const VEHICLE_LABEL: Record<string, string> = { MOTORCYCLE: 'Moto', CAR: 'Auto', PICKUP_TRUCK: 'Camioneta', TRUCK: 'Camión' }

const STATUS_TEXT: Record<string, string> = { PENDING: 'Pendiente', ACCEPTED: 'Aceptado', IN_PROGRESS: 'En Progreso', COMPLETED: 'Completado', CANCELLED: 'Cancelado' }
const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-800',
  ACCEPTED:    'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED:   'bg-green-100 text-green-800',
  CANCELLED:   'bg-red-100 text-red-800',
}

export function useRideHelpers() {
  function vehicleEmoji(v: string) {
    return VEHICLE_EMOJI[v] ?? '🚗'
  }
  function vehicleLabel(v: string) {
    return `${vehicleEmoji(v)} ${VEHICLE_LABEL[v] ?? v}`
  }
  function statusText(status: string) {
    return STATUS_TEXT[status] ?? status
  }
  function statusBadgeClass(status: string) {
    return STATUS_BADGE_CLASS[status] ?? 'bg-gray-100 text-gray-800'
  }
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  function timeAgo(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 60) return 'Hace un momento'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
    return formatDate(d)
  }
  function formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(n)
  }

  return { vehicleEmoji, vehicleLabel, statusText, statusBadgeClass, formatDate, timeAgo, formatPrice }
}
