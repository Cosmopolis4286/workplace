import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearOfflineData,
  enqueue,
  isNetworkError,
  isOfflineReadable,
  loadOutbox,
  loadRead,
  saveRead,
} from '../../utils/offlineCache'

describe('offlineCache (modo sin conexión)', () => {
  beforeEach(() => localStorage.clear())

  it('solo guarda las rutas marcadas, con o sin query', () => {
    expect(isOfflineReadable('/menu/products?page=1')).toBe(true)
    expect(isOfflineReadable('/catalog/orders/mine?status=PENDING')).toBe(true)
    expect(isOfflineReadable('/payments/manual/reports/incoming')).toBe(true)
    expect(isOfflineReadable('/auth/me')).toBe(false)
    expect(isOfflineReadable('/menu-otra')).toBe(false)
  })

  it('guarda y devuelve la copia por usuario, con la hora', () => {
    saveRead('u1', '/orders', { data: [1, 2] })
    expect(loadRead('u1', '/orders')?.data).toEqual({ data: [1, 2] })
    expect(loadRead('u1', '/orders')?.at).toMatch(/^\d{4}-/)
    // Otro usuario en el mismo teléfono no ve la copia.
    expect(loadRead('u2', '/orders')).toBeNull()
  })

  it('no duplica la misma acción en la cola', () => {
    const base = { userId: 'u1', method: 'PATCH' as const, url: '/catalog/orders/o1/delivered', body: {}, label: 'x' }
    enqueue(base)
    enqueue(base)
    enqueue({ ...base, url: '/catalog/orders/o2/delivered' })
    expect(loadOutbox().map(i => i.url)).toEqual([
      '/catalog/orders/o1/delivered',
      '/catalog/orders/o2/delivered',
    ])
  })

  it('al cerrar sesión borra copias y cola, y nada más', () => {
    saveRead('u1', '/orders', {})
    enqueue({ userId: 'u1', method: 'PATCH', url: '/x', body: {}, label: 'x' })
    localStorage.setItem('otra-cosa', '1')
    clearOfflineData()
    expect(loadRead('u1', '/orders')).toBeNull()
    expect(loadOutbox()).toEqual([])
    expect(localStorage.getItem('otra-cosa')).toBe('1')
  })

  it('distingue un corte de red de un error HTTP', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkError(Object.assign(new Error('x'), { status: 500 }))).toBe(false)
  })
})
