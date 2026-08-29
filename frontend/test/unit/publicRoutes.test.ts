import { isPublicRoute } from '@/utils/publicRoutes'

describe('isPublicRoute', () => {
  it('allows exact-match static public routes', () => {
    expect(isPublicRoute('/')).toBe(true)
    expect(isPublicRoute('/login')).toBe(true)
    expect(isPublicRoute('/pricing')).toBe(true)
  })

  it('allows public profile pages by prefix', () => {
    expect(isPublicRoute('/p/juanperez')).toBe(true)
  })

  it('allows public commerce store pages by prefix', () => {
    expect(isPublicRoute('/loja/mi-tienda')).toBe(true)
  })

  it('allows public professional pages by prefix', () => {
    expect(isPublicRoute('/pro/juan-perez')).toBe(true)
  })

  it('rejects known protected routes', () => {
    expect(isPublicRoute('/dashboard')).toBe(false)
    expect(isPublicRoute('/orders')).toBe(false)
    expect(isPublicRoute('/settings')).toBe(false)
  })

  it('does not match unrelated routes that merely start with a similar prefix', () => {
    expect(isPublicRoute('/products')).toBe(false)
  })
})
