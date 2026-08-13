const LOCALE = 'es'

export function useDateFormat() {
  function toDate(value: Date | string): Date {
    return typeof value === 'string' ? new Date(value) : value
  }

  /** "5 ago 2026" */
  function formatDate(value: Date | string): string {
    return toDate(value).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  /** "5 de agosto de 2026" */
  function formatDateLong(value: Date | string): string {
    return toDate(value).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
  }

  /** "5 ago 2026, 14:30" */
  function formatDateTime(value: Date | string): string {
    return toDate(value).toLocaleString(LOCALE, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  /** "5 ago, 14:30" (sin año, para listas recientes) */
  function formatDateTimeShort(value: Date | string): string {
    return toDate(value).toLocaleString(LOCALE, {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  /** "agosto 2026" */
  function formatMonthYear(value: Date | string): string {
    return toDate(value).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
  }

  /** "hace 5 min", "hace 2h", ... "5 ago" para fechas antiguas */
  function timeAgo(value: Date | string): string {
    const target = toDate(value)
    const diff = Math.floor((Date.now() - target.getTime()) / 1000)

    if (diff < 10) return 'justo ahora'
    if (diff < 60) return `hace ${diff} segundo${diff !== 1 ? 's' : ''}`
    const mins = Math.floor(diff / 60)
    if (mins < 60) return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `hace ${days}d`
    return toDate(value).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
  }

  /** "1.234,56" */
  function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return value.toLocaleString(LOCALE, options)
  }

  return {
    formatDate,
    formatDateLong,
    formatDateTime,
    formatDateTimeShort,
    formatMonthYear,
    timeAgo,
    formatNumber,
  }
}
