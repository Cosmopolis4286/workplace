import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'

describe('PrismaService', () => {
  let service: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile()

    service = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should have prisma client initialized', () => {
    expect(service.client).toBeDefined()
  })

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      const connectSpy = jest.spyOn(service.client, '$connect').mockResolvedValue(undefined)
      
      await service.onModuleInit()
      
      expect(connectSpy).toHaveBeenCalled()
    })
  })

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      const disconnectSpy = jest.spyOn(service.client, '$disconnect').mockResolvedValue(undefined)
      
      await service.onModuleDestroy()
      
      expect(disconnectSpy).toHaveBeenCalled()
    })
  })

  describe('cleanDatabase', () => {
    it('should truncate all tables', async () => {
      const executeRawSpy = jest.spyOn(service.client, '$executeRaw').mockResolvedValue(undefined)
      
      await service.cleanDatabase()
      
      expect(executeRawSpy).toHaveBeenCalledWith expect.stringContaining('TRUNCATE TABLE'))
    })
  })

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const queryRawSpy = jest.spyOn(service.client, '$queryRaw').mockResolvedValue([{ status: 'ok' }])
      
      const result = await service.healthCheck()
      
      expect(result).toEqual({ status: 'ok', database: 'connected' })
      expect(queryRawSpy).toHaveBeenCalledWith expect.stringContaining('SELECT 1'))
    })

    it('should handle database connection errors', async () => {
      const queryRawSpy = jest.spyOn(service.client, '$queryRaw').mockRejectedValue(new Error('Connection failed'))
      
      await expect(service.healthCheck()).rejects.toThrow('Connection failed')
    })
  })
})
