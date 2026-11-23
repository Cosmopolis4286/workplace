/**
 * Recordatorio amable de fiado por WhatsApp. Lo envía el comercio desde su
 * propio WhatsApp (wa.me abre el chat con el mensaje listo): la app no
 * escribe al cliente ni guarda la conversación.
 */

/**
 * Número en formato internacional para wa.me. Los teléfonos de Venezuela se
 * anotan como 0414-1234567 o 414 1234567: se pasan a 58414…. Devuelve null si
 * no parece un número válido.
 */
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = `58${digits.slice(1)}`
  else if (digits.length === 10 && digits.startsWith('4')) digits = `58${digits}`
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export function fiadoReminderText(opts: {
  customerName: string
  commerceName?: string | null
  balanceUsd: number
  vesPerUsd?: number | null
}) {
  const first = opts.customerName.trim().split(/\s+/)[0] || opts.customerName
  const where = opts.commerceName?.trim() ? ` en ${opts.commerceName.trim()}` : ''
  const bs = opts.vesPerUsd && opts.vesPerUsd > 0
    ? ` (Bs ${fmt(opts.balanceUsd * opts.vesPerUsd)} a la tasa de hoy)`
    : ''
  const usd = '$' + fmt(opts.balanceUsd)
  return `Hola ${first}, ¿cómo estás? Te escribo para recordarte que tu saldo${where} es de ${usd}${bs}. Puedes abonar lo que puedas, en efectivo o Pago Móvil. ¡Gracias!`
}

/** Enlace wa.me con el recordatorio; sin número abre WhatsApp para elegir el contacto. */
export function fiadoReminderUrl(phone: string | null | undefined, text: string) {
  const number = toWhatsappNumber(phone)
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(text)}`
}
