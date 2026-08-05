import { Inject, Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../../prisma/prisma.service'
import type { Job, JobType, JobModality, JobStatus, JobApplication, JobApplicationStatus } from '@prisma/client'
import { normalizeTags, tagSearchCondition } from '../../../common/utils/tags.util'
import { PlanLimitsFacade, PLAN_LIMITS_FACADE } from '../../money/plans/plan-limits.facade'
import { NotificationsService } from '../../engagement/notifications/notifications.service'

export interface JobWithEmployer extends Job {
  employer: {
    id: string
    firstName: string
    lastName: string
    username: string | null
    avatar: string | null
    country: string | null
    state: string | null
    city: string | null
    category: { name: string } | null
    subcategory: { name: string } | null
  }
  category: {
    id: string
    name: string
    color: string
    icon: string | null
  } | null
  _count?: {
    applications: number
  }
}

export interface CreateJobDto {
  title: string
  description: string
  requirements?: string[]
  benefits?: string[]
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  location?: string
  type?: JobType
  modality?: JobModality
  experienceLevel?: string
  tags?: string[]
  categoryId?: string
  expiresAt?: string
}

export interface UpdateJobDto extends Partial<CreateJobDto> {
  status?: JobStatus
}

export interface JobFilters {
  search?: string
  categoryId?: string
  type?: JobType
  modality?: JobModality
  employerId?: string
  status?: JobStatus
  country?: string
  state?: string
  city?: string
}

export interface JobQuery extends JobFilters {
  page?: number
  limit?: number
  sort?: 'relevance' | 'newest' | 'salary_asc' | 'salary_desc'
}

export interface CreateApplicationDto {
  jobId: string
  coverLetter?: string
  phone?: string
  email?: string
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLAN_LIMITS_FACADE) private readonly planLimits: PlanLimitsFacade,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  async getCategories() {
    const categories = await this.prisma.jobCategory.findMany({
      include: {
        _count: {
          select: { jobs: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: { name: 'asc' },
    })

    return categories.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      description: c.description,
      jobCount: c._count.jobs,
    }))
  }

  // ─── Tags (Public) ──────────────────────────────────────────────────────────

  // Top tags reales (por frecuencia de uso) entre empleos activos, opcionalmente
  // filtrados por substring `q` para autocompletado. Solo se trae la columna
  // `tags` (liviana) y el conteo se hace en memoria — evita tener que mantener
  // una tabla maestra de tags separada solo para esta sugerencia.
  async getPopularTags(q?: string, limit = 20): Promise<{ tag: string; count: number }[]> {
    const jobs = await this.prisma.job.findMany({
      where: { status: 'ACTIVE' },
      select: { tags: true },
    })
    const counts = new Map<string, number>()
    for (const job of jobs) {
      for (const tag of job.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    const query = q?.trim().toLowerCase()
    return Array.from(counts.entries())
      .filter(([tag]) => !query || tag.includes(query))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }))
  }

  // ─── Jobs CRUD ──────────────────────────────────────────────────────────────

  async createJob(userId: string, dto: CreateJobDto): Promise<Job> {
    await this.planLimits.assertJobLimit(userId);
    return this.prisma.job.create({
      data: {
        ...dto,
        employerId: userId,
        requirements: dto.requirements || [],
        benefits: dto.benefits || [],
        tags: normalizeTags(dto.tags) || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    })
  }

  async updateJob(jobId: string, userId: string, dto: UpdateJobDto): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundException('Empleo no encontrado')
    if (job.employerId !== userId) throw new ForbiddenException('No tienes permiso para editar este empleo')

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...dto,
        tags: normalizeTags(dto.tags),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    })
  }

  async deleteJob(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundException('Empleo no encontrado')
    if (job.employerId !== userId) throw new ForbiddenException('No tienes permiso para eliminar este empleo')

    await this.prisma.job.delete({ where: { id: jobId } })
  }

  // ─── Job Catalog (Public) ───────────────────────────────────────────────────

  private readonly catalogJobInclude = {
    employer: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        country: true,
        state: true,
        city: true,
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
      },
    },
    category: {
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
      },
    },
    _count: { select: { applications: true } },
  } as const

  async getCatalogJobs(query: JobQuery): Promise<{ data: JobWithEmployer[]; total: number; totalPages: number; locationTier?: 'city' | 'state' | 'country' | null }> {
    const {
      search, categoryId, type, modality, status = 'ACTIVE',
      sort = 'relevance', country, state, city,
    } = query
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 16

    const where: any = { status }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: tagSearchCondition(search) },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (categoryId) where.categoryId = categoryId
    if (type) where.type = type
    if (modality) where.modality = modality

    const orderBy: any = {}
    switch (sort) {
      case 'newest':
        orderBy.createdAt = 'desc'
        break
      case 'salary_asc':
        orderBy.salaryMin = 'asc'
        break
      case 'salary_desc':
        orderBy.salaryMax = 'desc'
        break
      default:
        orderBy.createdAt = 'desc'
    }

    if (city || state || country) {
      return this.getCatalogJobsNearMe(where, { country, state, city }, page, limit, orderBy)
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: this.catalogJobInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ])

    return {
      data: jobs as JobWithEmployer[],
      total,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Filtra empleos por ubicación del empleador con fallback en cascada:
   * ciudad exacta → estado → país.
   */
  private async getCatalogJobsNearMe(
    baseWhere: any,
    location: { country?: string; state?: string; city?: string },
    page: number,
    limit: number,
    orderBy: any
  ): Promise<{ data: JobWithEmployer[]; total: number; totalPages: number; locationTier: 'city' | 'state' | 'country' | null }> {
    const { country, state, city } = location
    const skip = (page - 1) * limit

    const tiers: { tier: 'city' | 'state' | 'country'; employer: any }[] = []
    if (city) tiers.push({ tier: 'city', employer: { city: { equals: city, mode: 'insensitive' } } })
    if (state) tiers.push({ tier: 'state', employer: { state: { equals: state, mode: 'insensitive' } } })
    if (country) tiers.push({ tier: 'country', employer: { country: { equals: country, mode: 'insensitive' } } })

    for (const { tier, employer } of tiers) {
      const where = { ...baseWhere, employer }
      const [jobs, total] = await Promise.all([
        this.prisma.job.findMany({ where, include: this.catalogJobInclude, orderBy, skip, take: limit }),
        this.prisma.job.count({ where }),
      ])
      if (total > 0) {
        return { data: jobs as JobWithEmployer[], total, totalPages: Math.ceil(total / limit), locationTier: tier }
      }
    }

    return { data: [], total: 0, totalPages: 0, locationTier: null }
  }

  async getJobById(jobId: string): Promise<JobWithEmployer | null> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        _count: { select: { applications: true } },
      },
    })

    return job as JobWithEmployer | null
  }

  // ─── My Jobs (Employer) ─────────────────────────────────────────────────────

  async getMyJobs(userId: string): Promise<JobWithEmployer[]> {
    const jobs = await this.prisma.job.findMany({
      where: { employerId: userId },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return jobs as JobWithEmployer[]
  }

  async getMyJobsStats(userId: string) {
    const grouped = await this.prisma.job.groupBy({
      by: ['status'],
      where: { employerId: userId },
      _count: { _all: true },
    })
    const counts: Record<string, number> = { ACTIVE: 0, PAUSED: 0, INACTIVE: 0, CLOSED: 0 }
    for (const g of grouped) counts[g.status] = g._count._all
    const total = counts.ACTIVE + counts.PAUSED + counts.INACTIVE + counts.CLOSED
    return { total, activos: counts.ACTIVE, pausados: counts.PAUSED, inactivos: counts.INACTIVE, cerrados: counts.CLOSED }
  }

  // ─── Applications ───────────────────────────────────────────────────────────

  async createApplication(userId: string, dto: CreateApplicationDto): Promise<JobApplication> {
    const job = await this.prisma.job.findUnique({ where: { id: dto.jobId } })
    if (!job) throw new NotFoundException('Empleo no encontrado')
    if (job.employerId === userId) throw new ForbiddenException('No puedes aplicar a tu propio empleo')
    if (job.status !== 'ACTIVE') throw new ForbiddenException('Este empleo no está activo')

    let application: JobApplication
    try {
      application = await this.prisma.jobApplication.create({
        data: {
          jobId: dto.jobId,
          applicantId: userId,
          coverLetter: dto.coverLetter,
          phone: dto.phone,
          email: dto.email,
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya aplicaste a este empleo')
      }
      throw e
    }

    const applicant = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    })
    const applicantName = applicant ? `${applicant.firstName} ${applicant.lastName}` : 'Un candidato'
    this.notifications
      .notifyNewJobApplication(job.employerId, applicantName, job.title)
      .catch(() => {})

    return application
  }

  async getMyApplications(userId: string) {
    const applications = await this.prisma.jobApplication.findMany({
      where: { applicantId: userId },
      include: {
        job: {
          include: {
            employer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                avatar: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return applications
  }

  async getJobApplications(jobId: string, employerId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } })
    if (!job) throw new NotFoundException('Empleo no encontrado')
    if (job.employerId !== employerId) throw new ForbiddenException('No tienes permiso para ver estas aplicaciones')

    const applications = await this.prisma.jobApplication.findMany({
      where: { jobId },
      include: {
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return applications
  }

  async updateApplicationStatus(
    applicationId: string,
    employerId: string,
    status: JobApplicationStatus,
  ): Promise<JobApplication> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: { include: { employer: { select: { firstName: true, lastName: true } } } } },
    })
    if (!application) throw new NotFoundException('Aplicación no encontrada')
    if (application.job.employerId !== employerId) {
      throw new ForbiddenException('No tienes permiso para actualizar esta aplicación')
    }

    const updated = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
    })

    if (status === 'ACCEPTED' || status === 'REJECTED') {
      const employerName = `${application.job.employer.firstName} ${application.job.employer.lastName}`
      this.notifications
        .notifyJobApplicationStatusChanged(application.applicantId, employerName, application.job.title, status)
        .catch(() => {})
    }

    return updated
  }

  // ─── Statistics ─────────────────────────────────────────────────────────────

  async getCatalogStats() {
    const [total, employers] = await Promise.all([
      this.prisma.job.count({ where: { status: 'ACTIVE' } }),
      this.prisma.job.groupBy({
        by: ['employerId'],
        where: { status: 'ACTIVE' },
        _count: { employerId: true },
      }),
    ])

    return {
      total,
      employers: employers.length,
    }
  }
}
