import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { JobsService } from '../../domains/platform/jobs/jobs.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PLAN_LIMITS_FACADE, PlanLimitsFacade } from '../../domains/money/plans/plan-limits.facade'
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service'
import { CategoryScopeService } from '../../common/category-scope/category-scope.service'

describe('JobsService', () => {
  let service: JobsService
  let mockPrismaService: any
  let mockPlanLimits: Partial<PlanLimitsFacade>
  let mockNotificationsService: Partial<NotificationsService>

  const EMPLOYER_ID = 'employer-1'
  const APPLICANT_ID = 'applicant-1'
  const JOB_ID = 'job-1'
  const APPLICATION_ID = 'application-1'

  function baseJob(overrides: Partial<any> = {}) {
    return {
      id: JOB_ID,
      title: 'Diseñador gráfico',
      employerId: EMPLOYER_ID,
      status: 'ACTIVE',
      ...overrides,
    }
  }

  beforeEach(async () => {
    mockPrismaService = {
      job: { create: jest.fn(), findUnique: jest.fn() },
      jobApplication: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
    }
    mockPlanLimits = {
      assertJobLimit: jest.fn().mockResolvedValue(undefined),
    }
    mockNotificationsService = {
      notifyNewJobApplication: jest.fn().mockResolvedValue(undefined),
      notifyJobApplicationStatusChanged: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PLAN_LIMITS_FACADE, useValue: mockPlanLimits },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CategoryScopeService, useValue: { isVisibleForCategory: jest.fn(), filterByCategory: jest.fn(), getUserCategoryId: jest.fn() } },
      ],
    }).compile()

    service = module.get<JobsService>(JobsService)
  })

  describe('createJob', () => {
    it('verifica el límite de plan antes de crear', async () => {
      mockPrismaService.job.create.mockResolvedValue(baseJob())

      await service.createJob(EMPLOYER_ID, { title: 'X', description: 'Y' } as any)

      expect(mockPlanLimits.assertJobLimit).toHaveBeenCalledWith(EMPLOYER_ID)
      expect(mockPrismaService.job.create).toHaveBeenCalled()
    })

    it('propaga el error si se alcanzó el límite de plan', async () => {
      ;(mockPlanLimits.assertJobLimit as jest.Mock).mockRejectedValue(new ForbiddenException('límite alcanzado'))

      await expect(service.createJob(EMPLOYER_ID, { title: 'X', description: 'Y' } as any)).rejects.toBeInstanceOf(ForbiddenException)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })
  })

  describe('createApplication', () => {
    it('lanza NotFoundException si el empleo no existe', async () => {
      mockPrismaService.job.findUnique.mockResolvedValue(null)

      await expect(service.createApplication(APPLICANT_ID, { jobId: JOB_ID })).rejects.toBeInstanceOf(NotFoundException)
    })

    it('rechaza aplicar a tu propio empleo', async () => {
      mockPrismaService.job.findUnique.mockResolvedValue(baseJob({ employerId: APPLICANT_ID }))

      await expect(service.createApplication(APPLICANT_ID, { jobId: JOB_ID })).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('rechaza aplicar a un empleo que no está activo', async () => {
      mockPrismaService.job.findUnique.mockResolvedValue(baseJob({ status: 'CLOSED' }))

      await expect(service.createApplication(APPLICANT_ID, { jobId: JOB_ID })).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('crea la aplicación y notifica al empleador', async () => {
      mockPrismaService.job.findUnique.mockResolvedValue(baseJob())
      mockPrismaService.jobApplication.create.mockResolvedValue({ id: APPLICATION_ID, jobId: JOB_ID, applicantId: APPLICANT_ID })
      mockPrismaService.user.findUnique.mockResolvedValue({ firstName: 'Ana', lastName: 'Pérez' })

      const result = await service.createApplication(APPLICANT_ID, { jobId: JOB_ID })

      expect(result.id).toBe(APPLICATION_ID)
      expect(mockNotificationsService.notifyNewJobApplication).toHaveBeenCalledWith(EMPLOYER_ID, 'Ana Pérez', 'Diseñador gráfico')
    })

    it('convierte el error de unicidad (P2002) en ConflictException con mensaje claro', async () => {
      mockPrismaService.job.findUnique.mockResolvedValue(baseJob())
      mockPrismaService.jobApplication.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '5.22.0' }),
      )

      await expect(service.createApplication(APPLICANT_ID, { jobId: JOB_ID })).rejects.toBeInstanceOf(ConflictException)
      expect(mockNotificationsService.notifyNewJobApplication).not.toHaveBeenCalled()
    })
  })

  describe('updateApplicationStatus', () => {
    function baseApplication(overrides: Partial<any> = {}) {
      return {
        id: APPLICATION_ID,
        applicantId: APPLICANT_ID,
        job: {
          id: JOB_ID,
          title: 'Diseñador gráfico',
          employerId: EMPLOYER_ID,
          employer: { firstName: 'Carlos', lastName: 'Gómez' },
        },
        ...overrides,
      }
    }

    it('lanza NotFoundException si la aplicación no existe', async () => {
      mockPrismaService.jobApplication.findUnique.mockResolvedValue(null)

      await expect(service.updateApplicationStatus(APPLICATION_ID, EMPLOYER_ID, 'ACCEPTED' as any)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('rechaza si quien actualiza no es el empleador dueño del job', async () => {
      mockPrismaService.jobApplication.findUnique.mockResolvedValue(baseApplication())

      await expect(service.updateApplicationStatus(APPLICATION_ID, 'otro-usuario', 'ACCEPTED' as any)).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('notifica al aplicante cuando el estado es ACCEPTED', async () => {
      mockPrismaService.jobApplication.findUnique.mockResolvedValue(baseApplication())
      mockPrismaService.jobApplication.update.mockResolvedValue(baseApplication({ status: 'ACCEPTED' }))

      await service.updateApplicationStatus(APPLICATION_ID, EMPLOYER_ID, 'ACCEPTED' as any)

      expect(mockNotificationsService.notifyJobApplicationStatusChanged).toHaveBeenCalledWith(
        APPLICANT_ID, 'Carlos Gómez', 'Diseñador gráfico', 'ACCEPTED',
      )
    })

    it('notifica al aplicante cuando el estado es REJECTED', async () => {
      mockPrismaService.jobApplication.findUnique.mockResolvedValue(baseApplication())
      mockPrismaService.jobApplication.update.mockResolvedValue(baseApplication({ status: 'REJECTED' }))

      await service.updateApplicationStatus(APPLICATION_ID, EMPLOYER_ID, 'REJECTED' as any)

      expect(mockNotificationsService.notifyJobApplicationStatusChanged).toHaveBeenCalledWith(
        APPLICANT_ID, 'Carlos Gómez', 'Diseñador gráfico', 'REJECTED',
      )
    })

    it('no notifica en transiciones intermedias (SEEN, IN_PROGRESS)', async () => {
      mockPrismaService.jobApplication.findUnique.mockResolvedValue(baseApplication())
      mockPrismaService.jobApplication.update.mockResolvedValue(baseApplication({ status: 'SEEN' }))

      await service.updateApplicationStatus(APPLICATION_ID, EMPLOYER_ID, 'SEEN' as any)

      expect(mockNotificationsService.notifyJobApplicationStatusChanged).not.toHaveBeenCalled()
    })
  })
})
