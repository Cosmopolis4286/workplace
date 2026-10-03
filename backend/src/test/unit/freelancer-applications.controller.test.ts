import { GoneException } from '@nestjs/common'
import { FreelancerApplicationsController } from '../../domains/identity-access/freelancer-applications/freelancer-applications.controller'

describe('FreelancerApplicationsController (deprecated)', () => {
  const service = {
    create: jest.fn(),
    getMine: jest.fn().mockResolvedValue([]),
    findAllPending: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    review: jest.fn().mockResolvedValue({ id: 'app-1' }),
  }
  const controller = new FreelancerApplicationsController(service as any)

  beforeEach(() => jest.clearAllMocks())

  it('rejects new applications with 410 pointing to /profile-activations, without writing anything', () => {
    expect(() => controller.create({ id: 'u1' }, { categoryId: 'c1' } as any)).toThrow(GoneException)
    expect(() => controller.create({ id: 'u1' }, { categoryId: 'c1' } as any)).toThrow(/profile-activations/)
    expect(service.create).not.toHaveBeenCalled()
  })

  it('still lets admins review legacy PENDING applications', async () => {
    await controller.review('app-1', { id: 'admin-1' }, { status: 'APPROVED' } as any)
    expect(service.review).toHaveBeenCalledWith('app-1', 'admin-1', { status: 'APPROVED' })
  })

  it('still lets a user read their own historical applications', async () => {
    await controller.getMine({ id: 'u1' })
    expect(service.getMine).toHaveBeenCalledWith('u1')
  })
})
