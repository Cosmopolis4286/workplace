import { Test, TestingModule } from '@nestjs/testing'
import { HealthController } from '../health/health.controller'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()

    controller = module.get<HealthController>(HealthController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('check', () => {
    it('should return health status', async () => {
      const result = await controller.check()

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
        version: expect.any(String),
      })
    })
  })

  describe('ready', () => {
    it('should return ready status', async () => {
      const result = await controller.ready()

      expect(result).toEqual({
        status: 'ready',
        timestamp: expect.any(String),
      })
    })
  })

  describe('live', () => {
    it('should return live status', async () => {
      const result = await controller.live()

      expect(result).toEqual({
        status: 'live',
        timestamp: expect.any(String),
      })
    })
  })
})
