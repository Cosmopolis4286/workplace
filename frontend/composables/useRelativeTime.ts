export function useRelativeTime() {
  function timeAgo(date: Date | string): string {
    const target = typeof date === 'string' ? new Date(date) : date
    const diff = Math.floor((Date.now() - target.getTime()) / 1000)

    if (diff < 10) return 'justo ahora'
    if (diff < 60) return `hace ${diff} segundo${diff !== 1 ? 's' : ''}`
    const mins = Math.floor(diff / 60)
    if (mins < 60) return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `hace ${days}d`
    return target.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  }

  return { timeAgo }
}
