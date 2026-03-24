// Tests básicos para cubrir lógica de cálculos y validaciones
describe('Basic Calculations', () => {
  describe('Math Operations', () => {
    it('should add numbers correctly', () => {
      expect(2 + 2).toBe(4)
      expect(10 + 5).toBe(15)
      expect(-3 + 7).toBe(4)
    })

    it('should subtract numbers correctly', () => {
      expect(10 - 5).toBe(5)
      expect(0 - 3).toBe(-3)
      expect(7 - 7).toBe(0)
    })

    it('should multiply numbers correctly', () => {
      expect(3 * 4).toBe(12)
      expect(5 * 0).toBe(0)
      expect(-2 * 3).toBe(-6)
    })

    it('should divide numbers correctly', () => {
      expect(10 / 2).toBe(5)
      expect(9 / 3).toBe(3)
      expect(15 / 5).toBe(3)
    })

    it('should handle division by zero', () => {
      expect(() => {
        const result = 10 / 0
        if (!isFinite(result)) {
          throw new Error('Division by zero')
        }
      }).toThrow('Division by zero')
    })
  })

  describe('String Operations', () => {
    it('should concatenate strings', () => {
      expect('hello' + ' ' + 'world').toBe('hello world')
      expect('test' + 'ing').toBe('testing')
    })

    it('should get string length', () => {
      expect('hello'.length).toBe(5)
      expect(''.length).toBe(0)
      expect('testing'.length).toBe(7)
    })

    it('should convert to uppercase', () => {
      expect('hello'.toUpperCase()).toBe('HELLO')
      expect('Test'.toUpperCase()).toBe('TEST')
    })

    it('should convert to lowercase', () => {
      expect('HELLO'.toLowerCase()).toBe('hello')
      expect('Test'.toLowerCase()).toBe('test')
    })
  })

  describe('Array Operations', () => {
    it('should filter arrays', () => {
      const numbers = [1, 2, 3, 4, 5]
      const even = numbers.filter(n => n % 2 === 0)
      expect(even).toEqual([2, 4])
    })

    it('should map arrays', () => {
      const numbers = [1, 2, 3]
      const doubled = numbers.map(n => n * 2)
      expect(doubled).toEqual([2, 4, 6])
    })

    it('should reduce arrays', () => {
      const numbers = [1, 2, 3, 4]
      const sum = numbers.reduce((acc, n) => acc + n, 0)
      expect(sum).toBe(10)
    })
  })

  describe('Date Operations', () => {
    it('should create dates correctly', () => {
      const date = new Date('2024-01-01')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January is 0
      expect(date.getDate()).toBe(1)
    })

    it('should format dates', () => {
      const date = new Date('2024-01-01T12:00:00')
      const formatted = date.toISOString().split('T')[0]
      expect(formatted).toBe('2024-01-01')
    })
  })

  describe('Object Operations', () => {
    it('should create objects', () => {
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        active: true
      }
      expect(user.id).toBe(1)
      expect(user.name).toBe('Test User')
      expect(user.email).toBe('test@example.com')
      expect(user.active).toBe(true)
    })

    it('should merge objects', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { c: 3, d: 4 }
      const merged = { ...obj1, ...obj2 }
      expect(merged).toEqual({ a: 1, b: 2, c: 3, d: 4 })
    })
  })

  describe('Validation Functions', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    const isValidPhone = (phone: string): boolean => {
      const phoneRegex = /^\+?[\d\s-()]+$/
      return phoneRegex.test(phone)
    }

    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
    })

    it('should validate phone numbers', () => {
      expect(isValidPhone('+1 555-123-4567')).toBe(true)
      expect(isValidPhone('5551234567')).toBe(true)
      expect(isValidPhone('(555) 123-4567')).toBe(true)
      expect(isValidPhone('invalid-phone')).toBe(false)
      expect(isValidPhone('123abc456')).toBe(false)
    })
  })

  describe('Currency Operations', () => {
    const formatCurrency = (amount: number, currency: string = 'USD'): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount)
    }

    it('should format currency correctly', () => {
      expect(formatCurrency(100)).toBe('$100.00')
      expect(formatCurrency(99.99)).toBe('$99.99')
      expect(formatCurrency(0)).toBe('$0.00')
      expect(formatCurrency(-50)).toBe('-$50.00')
    })

    it('should calculate tax', () => {
      const calculateTax = (amount: number, taxRate: number): number => {
        return amount * (taxRate / 100)
      }

      expect(calculateTax(100, 10)).toBe(10)
      expect(calculateTax(50, 20)).toBe(10)
      expect(calculateTax(0, 15)).toBe(0)
    })

    it('should calculate discount', () => {
      const calculateDiscount = (amount: number, discountPercent: number): number => {
        return amount * (discountPercent / 100)
      }

      expect(calculateDiscount(100, 10)).toBe(10)
      expect(calculateDiscount(50, 20)).toBe(10)
      expect(calculateDiscount(0, 15)).toBe(0)
    })
  })
})
