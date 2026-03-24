// Tests que importan el código REAL para obtener cobertura
import { validateEmail } from '../../common/utils/validation'
import { formatCurrency } from '../../common/utils/format'
import { calculateDiscount } from '../../common/utils/calculations'
import { hashPassword } from '../../common/utils/security'
import { buildQueryParams } from '../../common/utils/url'

describe('Real Coverage Tests', () => {
  describe('Validation Utils', () => {
    it('should validate email correctly', () => {
      const result = validateEmail('test@example.com')
      expect(result).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = validateEmail('invalid-email')
      expect(result).toBe(false)
    })
  })

  describe('Format Utils', () => {
    it('should format currency correctly', () => {
      const result = formatCurrency(100, 'USD')
      expect(result).toBe('$100.00')
    })

    it('should format EUR currency', () => {
      const result = formatCurrency(50, 'EUR')
      expect(result).toBe('€50.00')
    })
  })

  describe('Calculation Utils', () => {
    it('should calculate discount correctly', () => {
      const result = calculateDiscount(100, 10)
      expect(result).toBe(10)
    })

    it('should calculate tax correctly', () => {
      const result = calculateDiscount(200, 15)
      expect(result).toBe(30)
    })
  })

  describe('Security Utils', () => {
    it('should hash password correctly', async () => {
      const result = await hashPassword('password123')
      expect(result).toBeDefined()
      expect(result).not.toBe('password123')
      expect(result.length).toBeGreaterThan(50)
    })
  })

  describe('URL Utils', () => {
    it('should build query params correctly', () => {
      const params = { page: 1, limit: 10, search: 'test' }
      const result = buildQueryParams(params)
      expect(result).toBe('page=1&limit=10&search=test')
    })

    it('should handle empty params', () => {
      const result = buildQueryParams({})
      expect(result).toBe('')
    })
  })
})
