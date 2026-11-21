import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('../../composables/core/useApi', () => ({ useApi: () => ({ get }) }))

describe('useDualPrice', () => {
  beforeEach(() => {
    vi.resetModules()
    get.mockReset()
  })

  it('muestra el precio del comercio y su equivalente a la tasa vigente', async () => {
    get.mockResolvedValue([
      { code: 'USD', rateToUsd: 1 },
      { code: 'VES', rateToUsd: 40 },
    ])
    const { useDualPrice } = await import('../../composables/catalog/useDualPrice')
    const { loadRate, primary, secondary } = useDualPrice()
    await loadRate()

    expect(primary(2.5, 'USD')).toBe('$2,50')
    expect(secondary(2.5, 'USD')).toBe('≈ Bs 100,00')
    expect(primary(80, 'VES')).toBe('Bs 80,00')
    expect(secondary(80, 'VES')).toBe('≈ $2,00')
  })

  it('sin tasa solo muestra el precio principal', async () => {
    get.mockRejectedValue(new Error('sin red'))
    const { useDualPrice } = await import('../../composables/catalog/useDualPrice')
    const { loadRate, primary, secondary } = useDualPrice()
    await loadRate()

    expect(primary(3, 'USD')).toBe('$3,00')
    expect(secondary(3, 'USD')).toBeNull()
  })
})
