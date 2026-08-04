import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { RedisService } from '../../../redis/redis.service'
import { LandingGateway } from './landing.gateway'
import { CreateTestimonialDto } from './dto/create-testimonial.dto'
import { UpdateTestimonialDto } from './dto/update-testimonial.dto'
import { UpdateStatDto } from './dto/update-stat.dto'
import { CreateFeatureDto } from './dto/create-feature.dto'
import { UpdateFeatureDto } from './dto/update-feature.dto'
import { CreateStepDto } from './dto/create-step.dto'
import { UpdateStepDto } from './dto/update-step.dto'

const CACHE_KEY_TESTIMONIALS = 'landing:testimonials'
const CACHE_KEY_STATS = 'landing:stats'
const CACHE_KEY_FEATURES = 'landing:features'
const CACHE_KEY_STEPS = 'landing:steps'
const CACHE_TTL = 3600 // 1 hour

@Injectable()
export class LandingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private gateway: LandingGateway,
  ) {}

  // ─── Public endpoints ──────────────────────────────────────────────────────

  async getPublicTestimonials() {
    const cached = await this.redis.get(CACHE_KEY_TESTIMONIALS)
    if (cached) return JSON.parse(cached)

    const testimonials = await this.prisma.landingTestimonial.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        quote: true,
        name: true,
        role: true,
        initials: true,
        avatarColor: true,
        createdAt: true,
      },
    })

    await this.redis.setex(CACHE_KEY_TESTIMONIALS, CACHE_TTL, JSON.stringify(testimonials))
    return testimonials
  }

  async getPublicStats() {
    const cached = await this.redis.get(CACHE_KEY_STATS)
    if (cached) return JSON.parse(cached)

    const dbStats = await this.prisma.landingStat.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    const stats = await Promise.all(
      dbStats.map(async (stat) => {
        if (!stat.isDynamic) return { key: stat.key, value: stat.value, label: stat.label }
        const computed = await this.computeDynamicStat(stat.key)
        return { key: stat.key, value: computed ?? stat.value, label: stat.label }
      }),
    )

    await this.redis.setex(CACHE_KEY_STATS, CACHE_TTL, JSON.stringify(stats))
    return stats
  }

  async getPublicFeatures() {
    const cached = await this.redis.get(CACHE_KEY_FEATURES)
    if (cached) return JSON.parse(cached)

    const features = await this.prisma.landingFeature.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, description: true, icon: true, bg: true },
    })

    await this.redis.setex(CACHE_KEY_FEATURES, CACHE_TTL, JSON.stringify(features))
    return features
  }

  async getPublicSteps() {
    const cached = await this.redis.get(CACHE_KEY_STEPS)
    if (cached) return JSON.parse(cached)

    const steps = await this.prisma.landingStep.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, desc: true, icon: true },
    })

    await this.redis.setex(CACHE_KEY_STEPS, CACHE_TTL, JSON.stringify(steps))
    return steps
  }

  private async computeDynamicStat(key: string): Promise<string | null> {
    switch (key) {
      case 'commerces': {
        const count = await this.prisma.commerce.count()
        return count > 0 ? `${count}+` : null
      }
      case 'orders': {
        const count = await this.prisma.order.count()
        return count > 1000 ? `${Math.floor(count / 1000)}k+` : `${count}+`
      }
      case 'freelancers': {
        const count = await this.prisma.user.count({ where: { role: 'FREELANCER' } })
        return `${count}+`
      }
      case 'services': {
        const count = await this.prisma.serviceRequest.count({ where: { status: 'CLOSED' } })
        return count > 1000 ? `${Math.floor(count / 1000)}k+` : `${count}+`
      }
      case 'rating': {
        const result = await this.prisma.review.aggregate({ _avg: { rating: true }, _count: true })
        return result._count > 0 ? `${result._avg.rating!.toFixed(1)}★` : null
      }
      default:
        return null
    }
  }

  // ─── Admin — Testimonials CRUD ─────────────────────────────────────────────

  async findAllTestimonials() {
    return this.prisma.landingTestimonial.findMany({ orderBy: { sortOrder: 'asc' } })
  }

  async createTestimonial(dto: CreateTestimonialDto) {
    const initials = dto.initials ?? this.buildInitials(dto.name)
    const result = await this.prisma.landingTestimonial.create({ data: { ...dto, initials } })
    await this.invalidateCache()
    this.gateway.broadcastUpdate('testimonials')
    return result
  }

  // Lista reseñas reales con buen rating (4-5★) y comentario, verificadas por
  // una transacción real y aún no usadas como testimonio, para que el admin
  // pueda convertirlas en uno con un clic.
  async findVerifiedReviewCandidates() {
    const usedReviewIds = (
      await this.prisma.landingTestimonial.findMany({
        where: { sourceReviewId: { not: null } },
        select: { sourceReviewId: true },
      })
    ).map((t) => t.sourceReviewId as string)

    return this.prisma.review.findMany({
      where: {
        rating: { gte: 4 },
        comment: { not: null },
        isHidden: false,
        id: { notIn: usedReviewIds },
        OR: [{ verifiedOrderId: { not: null } }, { verifiedRequestId: { not: null } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, commerce: { select: { name: true, type: true } } } },
      },
    })
  }

  async createTestimonialFromReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        author: { select: { firstName: true, lastName: true } },
        target: { select: { commerce: { select: { name: true, type: true } } } },
      },
    })
    if (!review) throw new NotFoundException('Reseña no encontrada')
    if (!review.comment) throw new NotFoundException('La reseña no tiene comentario para usar como cita')

    const name = `${review.author.firstName} ${review.author.lastName}`
    const role = review.target.commerce
      ? `Cliente, ${review.target.commerce.name}`
      : 'Cliente verificado'

    const result = await this.prisma.landingTestimonial.create({
      data: {
        quote: review.comment,
        name,
        role,
        initials: this.buildInitials(name),
        sourceReviewId: review.id,
        isActive: true,
      },
    })
    await this.invalidateCache()
    this.gateway.broadcastUpdate('testimonials')
    return result
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto) {
    await this.findTestimonialOrFail(id)
    const result = await this.prisma.landingTestimonial.update({ where: { id }, data: dto })
    await this.invalidateCache()
    this.gateway.broadcastUpdate('testimonials')
    return result
  }

  async deleteTestimonial(id: string) {
    await this.findTestimonialOrFail(id)
    await this.prisma.landingTestimonial.delete({ where: { id } })
    await this.invalidateCache()
    this.gateway.broadcastUpdate('testimonials')
  }

  async reorderTestimonials(orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.landingTestimonial.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    )
    await this.invalidateCache()
    this.gateway.broadcastUpdate('testimonials')
    return this.findAllTestimonials()
  }

  // ─── Admin — Stats CRUD ────────────────────────────────────────────────────

  async findAllStats() {
    return this.prisma.landingStat.findMany({ orderBy: { sortOrder: 'asc' } })
  }

  async upsertStat(key: string, dto: UpdateStatDto) {
    const result = await this.prisma.landingStat.upsert({
      where: { key },
      update: dto,
      create: { key, label: dto.label ?? key, value: dto.value ?? '', ...dto },
    })
    await this.redis.del(CACHE_KEY_STATS)
    this.gateway.broadcastUpdate('stats')
    return result
  }

  // ─── Admin — Features CRUD ─────────────────────────────────────────────────

  async findAllFeatures() {
    return this.prisma.landingFeature.findMany({ orderBy: { sortOrder: 'asc' } })
  }

  async createFeature(dto: CreateFeatureDto) {
    const result = await this.prisma.landingFeature.create({ data: dto })
    await this.redis.del(CACHE_KEY_FEATURES)
    this.gateway.broadcastUpdate('features')
    return result
  }

  async updateFeature(id: string, dto: UpdateFeatureDto) {
    await this.findFeatureOrFail(id)
    const result = await this.prisma.landingFeature.update({ where: { id }, data: dto })
    await this.redis.del(CACHE_KEY_FEATURES)
    this.gateway.broadcastUpdate('features')
    return result
  }

  async deleteFeature(id: string) {
    await this.findFeatureOrFail(id)
    await this.prisma.landingFeature.delete({ where: { id } })
    await this.redis.del(CACHE_KEY_FEATURES)
    this.gateway.broadcastUpdate('features')
  }

  // ─── Admin — Steps CRUD ────────────────────────────────────────────────────

  async findAllSteps() {
    return this.prisma.landingStep.findMany({ orderBy: { sortOrder: 'asc' } })
  }

  async createStep(dto: CreateStepDto) {
    const result = await this.prisma.landingStep.create({ data: dto })
    await this.redis.del(CACHE_KEY_STEPS)
    this.gateway.broadcastUpdate('steps')
    return result
  }

  async updateStep(id: string, dto: UpdateStepDto) {
    await this.findStepOrFail(id)
    const result = await this.prisma.landingStep.update({ where: { id }, data: dto })
    await this.redis.del(CACHE_KEY_STEPS)
    this.gateway.broadcastUpdate('steps')
    return result
  }

  async deleteStep(id: string) {
    await this.findStepOrFail(id)
    await this.prisma.landingStep.delete({ where: { id } })
    await this.redis.del(CACHE_KEY_STEPS)
    this.gateway.broadcastUpdate('steps')
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async findTestimonialOrFail(id: string) {
    const t = await this.prisma.landingTestimonial.findUnique({ where: { id } })
    if (!t) throw new NotFoundException(`Testimonio ${id} no encontrado`)
    return t
  }

  private async findFeatureOrFail(id: string) {
    const f = await this.prisma.landingFeature.findUnique({ where: { id } })
    if (!f) throw new NotFoundException(`Función ${id} no encontrada`)
    return f
  }

  private async findStepOrFail(id: string) {
    const s = await this.prisma.landingStep.findUnique({ where: { id } })
    if (!s) throw new NotFoundException(`Paso ${id} no encontrado`)
    return s
  }

  private buildInitials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
  }

  private async invalidateCache() {
    await Promise.all([this.redis.del(CACHE_KEY_TESTIMONIALS), this.redis.del(CACHE_KEY_STATS)])
  }
}
