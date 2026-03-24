import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from '../app.module'

describe('Basic Backend Tests', () => {
  let app: TestingModule

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
  })

  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle async operations', async () => {
    const result = await Promise.resolve('hello')
    expect(result).toBe('hello')
  })

  it('should have basic math operations', () => {
    expect(Math.max(1, 2, 3)).toBe(3)
    expect(Math.min(1, 2, 3)).toBe(1)
  })

  afterAll(async () => {
    await app.close()
  })
})
