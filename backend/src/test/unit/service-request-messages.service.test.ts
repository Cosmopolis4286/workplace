import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ServiceRequestMessagesService } from '../../domains/commerce-core/services/messages/service-request-messages.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'

describe('ServiceRequestMessagesService', () => {
  let service: ServiceRequestMessagesService
  let mockPrismaService: any
  let mockNotificationsService: Partial<NotificationsService>

  const PROVIDER_ID = 'provider-1'
  const CLIENT_ID = 'client-1'
  const OTHER_ID = 'other-1'
  const REQUEST_ID = 'req-1'

  function baseRequest(overrides: Partial<any> = {}) {
    return {
      id: REQUEST_ID,
      providerId: PROVIDER_ID,
      requesterId: CLIENT_ID,
      providerName: 'Proveedor Uno',
      clientName: 'Cliente Uno',
      serviceName: 'Servicio Uno',
      ...overrides,
    }
  }

  beforeEach(async () => {
    mockPrismaService = {
      serviceRequest: { findUnique: jest.fn() },
      serviceRequestMessage: {
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    }
    mockNotificationsService = {
      notifyNewServiceRequestMessage: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestMessagesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile()

    service = module.get<ServiceRequestMessagesService>(ServiceRequestMessagesService)
  })

  describe('list', () => {
    it('permite al proveedor ver la conversación', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest())
      mockPrismaService.serviceRequestMessage.findMany.mockResolvedValue([])

      await expect(service.list(REQUEST_ID, PROVIDER_ID)).resolves.toEqual([])
    })

    it('permite al cliente (requester) ver la conversación', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest())
      mockPrismaService.serviceRequestMessage.findMany.mockResolvedValue([])

      await expect(service.list(REQUEST_ID, CLIENT_ID)).resolves.toEqual([])
    })

    it('rechaza a un usuario que no es parte de la conversación', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest())

      await expect(service.list(REQUEST_ID, OTHER_ID)).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('lanza NotFoundException si la solicitud no existe', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(null)

      await expect(service.list(REQUEST_ID, PROVIDER_ID)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('send', () => {
    it('crea el mensaje y notifica al otro participante', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest())
      mockPrismaService.serviceRequestMessage.create.mockResolvedValue({ id: 'msg-1', body: 'Hola' })

      await service.send(REQUEST_ID, PROVIDER_ID, { body: 'Hola' } as any)

      expect(mockPrismaService.serviceRequestMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ serviceRequestId: REQUEST_ID, senderId: PROVIDER_ID, body: 'Hola' }) }),
      )
      expect(mockNotificationsService.notifyNewServiceRequestMessage).toHaveBeenCalledWith(
        CLIENT_ID, 'Proveedor Uno', 'Servicio Uno', REQUEST_ID,
      )
    })

    it('notifica al proveedor cuando el remitente es el cliente', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest())
      mockPrismaService.serviceRequestMessage.create.mockResolvedValue({ id: 'msg-1', body: 'Hola' })

      await service.send(REQUEST_ID, CLIENT_ID, { body: 'Hola' } as any)

      expect(mockNotificationsService.notifyNewServiceRequestMessage).toHaveBeenCalledWith(
        PROVIDER_ID, 'Cliente Uno', 'Servicio Uno', REQUEST_ID,
      )
    })

    it('rechaza a un usuario que no es parte de la conversación', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest())

      await expect(service.send(REQUEST_ID, OTHER_ID, { body: 'Hola' } as any)).rejects.toBeInstanceOf(ForbiddenException)
      expect(mockPrismaService.serviceRequestMessage.create).not.toHaveBeenCalled()
    })

    it('no falla si la solicitud es anónima (sin requesterId) y el proveedor intenta escribir', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest({ requesterId: null }))
      mockPrismaService.serviceRequestMessage.create.mockResolvedValue({ id: 'msg-1', body: 'Hola' })

      await service.send(REQUEST_ID, PROVIDER_ID, { body: 'Hola' } as any)

      expect(mockNotificationsService.notifyNewServiceRequestMessage).not.toHaveBeenCalled()
    })
  })

  describe('markRead', () => {
    it('marca como leídos solo los mensajes del otro participante', async () => {
      mockPrismaService.serviceRequest.findUnique.mockResolvedValue(baseRequest())
      mockPrismaService.serviceRequestMessage.updateMany.mockResolvedValue({ count: 2 })

      await service.markRead(REQUEST_ID, PROVIDER_ID)

      expect(mockPrismaService.serviceRequestMessage.updateMany).toHaveBeenCalledWith({
        where: { serviceRequestId: REQUEST_ID, senderId: { not: PROVIDER_ID }, readAt: null },
        data: { readAt: expect.any(Date) },
      })
    })
  })

  describe('getUnreadCount', () => {
    it('cuenta mensajes no leídos de solicitudes donde el usuario participa', async () => {
      mockPrismaService.serviceRequestMessage.count.mockResolvedValue(3)

      const result = await service.getUnreadCount(PROVIDER_ID)

      expect(result).toEqual({ count: 3 })
      expect(mockPrismaService.serviceRequestMessage.count).toHaveBeenCalledWith({
        where: {
          readAt: null,
          senderId: { not: PROVIDER_ID },
          serviceRequest: { OR: [{ providerId: PROVIDER_ID }, { requesterId: PROVIDER_ID }] },
        },
      })
    })
  })

  describe('getUnreadCountByRequest', () => {
    it('mapea el resultado de groupBy a un Record<serviceRequestId, count>', async () => {
      mockPrismaService.serviceRequestMessage.groupBy.mockResolvedValue([
        { serviceRequestId: 'req-1', _count: { _all: 2 } },
        { serviceRequestId: 'req-2', _count: { _all: 5 } },
      ])

      const result = await service.getUnreadCountByRequest(PROVIDER_ID)

      expect(result).toEqual({ 'req-1': 2, 'req-2': 5 })
      expect(mockPrismaService.serviceRequestMessage.groupBy).toHaveBeenCalledWith({
        by: ['serviceRequestId'],
        where: {
          readAt: null,
          senderId: { not: PROVIDER_ID },
          serviceRequest: { OR: [{ providerId: PROVIDER_ID }, { requesterId: PROVIDER_ID }] },
        },
        _count: { _all: true },
      })
    })

    it('devuelve un objeto vacío si no hay mensajes no leídos', async () => {
      mockPrismaService.serviceRequestMessage.groupBy.mockResolvedValue([])

      const result = await service.getUnreadCountByRequest(PROVIDER_ID)

      expect(result).toEqual({})
    })
  })
})
