import { describe, it, expect } from 'vitest'
import { toWhatsappNumber, fiadoReminderText, fiadoReminderUrl } from '../../utils/fiadoReminder'

describe('recordatorio de fiado por WhatsApp', () => {
  it('normaliza teléfonos venezolanos a 58…', () => {
    expect(toWhatsappNumber('0414-123.45.67')).toBe('584141234567')
    expect(toWhatsappNumber('414 1234567')).toBe('584141234567')
    expect(toWhatsappNumber('+58 414 1234567')).toBe('584141234567')
    expect(toWhatsappNumber('0058 414 1234567')).toBe('584141234567')
    expect(toWhatsappNumber('123')).toBeNull()
    expect(toWhatsappNumber(null)).toBeNull()
  })

  it('arma el mensaje con el saldo en $ y en Bs a la tasa del día', () => {
    const text = fiadoReminderText({
      customerName: 'Pedro Pérez',
      commerceName: 'Bodega La Esquina',
      balanceUsd: 12.5,
      vesPerUsd: 40,
    })
    expect(text).toContain('Hola Pedro,')
    expect(text).toContain('en Bodega La Esquina')
    expect(text).toContain('$12,50')
    expect(text).toContain('Bs 500,00')
  })

  it('sin tasa no muestra Bs; sin número abre WhatsApp para elegir contacto', () => {
    const text = fiadoReminderText({ customerName: 'Ana', balanceUsd: 3 })
    expect(text).not.toContain('Bs')
    expect(fiadoReminderUrl(null, 'hola')).toBe('https://wa.me/?text=hola')
    expect(fiadoReminderUrl('04141234567', 'hola')).toBe('https://wa.me/584141234567?text=hola')
  })
})
