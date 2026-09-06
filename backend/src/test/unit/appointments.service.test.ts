import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { I18nService } from 'nestjs-i18n'
import { AppointmentStatus } from '@prisma/client'
import { AppointmentsService } from '../../domains/operations/appointments/appointments.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CommerceResolverService } from '../../common/commerce-resolver/commerce-resolver.service'

describe('AppointmentsService', () => {
  let service: AppointmentsService
  let mockPrismaService: any

  const USER_ID = 'user-1'
  const COMMERCE_ID = 'commerce-1'
  const APPOINTMENT_ID = 'appointment-1'

  const mockI18nService = { t: jest.fn((key: string) => key) }

  function baseAppointment(overrides: Partial<any> = {}) {
    return {
      id: APPOINTMENT_ID,
      commerceId: COMMERCE_ID,
      customerName: 'Cliente Uno',
      date: new Date('2026-08-10T20:00:00Z'),
      partySize: 2,
      tableNumber: 5,
      status: AppointmentStatus.PENDING,
      ...overrides,
    }
  }

  beforeEach(async () => {
    mockPrismaService = {
      commerce: { findUnique: jest.fn().mockResolvedValue({ id: COMMERCE_ID }) },
      appointment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      customer: { findUnique: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: CommerceResolverService,
          useValue: {
            resolve: jest.fn(async (userId: string) => {
              const commerce = await mockPrismaService.commerce.findUnique({ where: { userId } })
              return commerce?.id ?? userId
            }),
            resolveOrCreate: jest.fn(),
          },
        },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile()

    service = module.get<AppointmentsService>(AppointmentsService)
  })

  describe('create', () => {
    it('crea sin validar solapamiento si no se especifica mesa', async () => {
      mockPrismaService.appointment.create.mockResolvedValue(baseAppointment({ tableNumber: undefined }))

      await service.create(USER_ID, {
        customerName: 'Cliente Uno', date: '2026-08-10T20:00:00Z', partySize: 2,
      } as any)

      expect(mockPrismaService.appointment.findFirst).not.toHaveBeenCalled()
      expect(mockPrismaService.appointment.create).toHaveBeenCalled()
    })

    it('rechaza si ya existe otra cita activa en la misma mesa dentro de la ventana', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue(baseAppointment())

      await expect(
        service.create(USER_ID, {
          customerName: 'Cliente Dos', date: '2026-08-10T21:00:00Z', partySize: 2, tableNumber: 5,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(mockPrismaService.appointment.create).not.toHaveBeenCalled()
    })

    it('permite crear si no hay conflicto de mesa', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue(null)
      mockPrismaService.appointment.create.mockResolvedValue(baseAppointment())

      await service.create(USER_ID, {
        customerName: 'Cliente Uno', date: '2026-08-10T20:00:00Z', partySize: 2, tableNumber: 5,
      } as any)

      expect(mockPrismaService.appointment.create).toHaveBeenCalled()
    })

    it('permite otra mesa distinta a la misma hora', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue(null)
      mockPrismaService.appointment.create.mockResolvedValue(baseAppointment({ tableNumber: 7 }))

      await service.create(USER_ID, {
        customerName: 'Cliente Uno', date: '2026-08-10T20:00:00Z', partySize: 2, tableNumber: 7,
      } as any)

      const findFirstArgs = mockPrismaService.appointment.findFirst.mock.calls[0][0]
      expect(findFirstArgs.where.tableNumber).toBe(7)
    })

    it('no cuenta como conflicto una cita CANCELLED en la misma mesa/hora', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValue(null)
      mockPrismaService.appointment.create.mockResolvedValue(baseAppointment())

      await service.create(USER_ID, {
        customerName: 'Cliente Uno', date: '2026-08-10T20:00:00Z', partySize: 2, tableNumber: 5,
      } as any)

      const findFirstArgs = mockPrismaService.appointment.findFirst.mock.calls[0][0]
      expect(findFirstArgs.where.status.in).toEqual(['PENDING', 'CONFIRMED', 'SEATED'])
    })
  })

  describe('update', () => {
    it('rechaza si el nuevo horario/mesa solapa con otra cita', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(baseAppointment())
      mockPrismaService.appointment.findFirst.mockResolvedValue(baseAppointment({ id: 'other-appointment' }))

      await expect(
        service.update(USER_ID, APPOINTMENT_ID, { tableNumber: 5, date: '2026-08-10T20:30:00Z' } as any),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('excluye la propia cita al verificar solapamiento', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(baseAppointment())
      mockPrismaService.appointment.findFirst.mockResolvedValue(null)
      mockPrismaService.appointment.update.mockResolvedValue(baseAppointment({ partySize: 4 }))

      await service.update(USER_ID, APPOINTMENT_ID, { partySize: 4 } as any)

      // partySize no toca date/tableNumber -> no debe re-chequear solapamiento
      expect(mockPrismaService.appointment.findFirst).not.toHaveBeenCalled()
    })

    it('no valida solapamiento si ni date ni tableNumber cambian', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(baseAppointment())
      mockPrismaService.appointment.update.mockResolvedValue(baseAppointment({ notes: 'actualizado' }))

      await service.update(USER_ID, APPOINTMENT_ID, { notes: 'actualizado' } as any)

      expect(mockPrismaService.appointment.findFirst).not.toHaveBeenCalled()
    })

    it('rechaza actualizar una cita de otro comercio', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(baseAppointment({ commerceId: 'otro-comercio' }))

      await expect(service.update(USER_ID, APPOINTMENT_ID, { notes: 'x' } as any)).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('lanza NotFoundException si la cita no existe', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null)

      await expect(service.update(USER_ID, APPOINTMENT_ID, { notes: 'x' } as any)).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('updateStatus', () => {
    it('permite una transición válida (PENDING -> CONFIRMED)', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(baseAppointment({ status: AppointmentStatus.PENDING }))
      mockPrismaService.appointment.update.mockResolvedValue(baseAppointment({ status: AppointmentStatus.CONFIRMED }))

      await service.updateStatus(USER_ID, APPOINTMENT_ID, AppointmentStatus.CONFIRMED)

      expect(mockPrismaService.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: AppointmentStatus.CONFIRMED } }),
      )
    })

    it('rechaza reabrir una cita CANCELLED', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(baseAppointment({ status: AppointmentStatus.CANCELLED }))

      await expect(
        service.updateStatus(USER_ID, APPOINTMENT_ID, AppointmentStatus.CONFIRMED),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(mockPrismaService.appointment.update).not.toHaveBeenCalled()
    })

    it('rechaza completar una cita que nunca fue confirmada ni sentada (PENDING -> COMPLETED)', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(baseAppointment({ status: AppointmentStatus.PENDING }))

      await expect(
        service.updateStatus(USER_ID, APPOINTMENT_ID, AppointmentStatus.COMPLETED),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('permite marcar NO_SHOW desde CONFIRMED', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(baseAppointment({ status: AppointmentStatus.CONFIRMED }))
      mockPrismaService.appointment.update.mockResolvedValue(baseAppointment({ status: AppointmentStatus.NO_SHOW }))

      await service.updateStatus(USER_ID, APPOINTMENT_ID, AppointmentStatus.NO_SHOW)

      expect(mockPrismaService.appointment.update).toHaveBeenCalled()
    })
  })
})
