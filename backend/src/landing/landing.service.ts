import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { CreateTestimonialDto } from './dto/create-testimonial.dto'
import { UpdateTestimonialDto } from './dto/update-testimonial.dto'
import { UpdateStatDto } from './dto/update-stat.dto'

const CACHE_KEY_TESTIMONIALS = 'landing:testimonials'
const CACHE_KEY_STATS = 'landing:stats'
const CACHE_TTL = 3600 // 1 hour

@Injectable()
export class LandingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ─── Public endpoints ──────────────────────────────────────────────────────

  async getPublicTestimonials() {
    const cached = await this.redis.get(CACHE_KEY_TESTIMONIALS)
    if (cached) return JSON.parse(cached)

    const testimonials = await this.prisma.landingTestimonial.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, quote: true, name: true, role: true, initials: true, avatarColor: true },
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
        if (!stat.isDynamic) return { value: stat.value, label: stat.label }
        const computed = await this.computeDynamicStat(stat.key)
        return { value: computed ?? stat.value, label: stat.label }
      }),
    )

    await this.redis.setex(CACHE_KEY_STATS, CACHE_TTL, JSON.stringify(stats))
    return stats
  }

  private async computeDynamicStat(key: string): Promise<string | null> {
    switch (key) {
      case 'restaurants': {
        const count = await this.prisma.restaurant.count()
        return count > 0 ? `${count}+` : null
      }
      case 'orders': {
        const count = await this.prisma.order.count()
        return count > 1000 ? `${Math.floor(count / 1000)}k+` : count > 0 ? `${count}+` : null
      }
      case 'rating': {
        const result = await this.prisma.landingTestimonial.count({ where: { isActive: true } })
        return result > 0 ? '4.9★' : null
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
    return result
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto) {
    await this.findTestimonialOrFail(id)
    const result = await this.prisma.landingTestimonial.update({ where: { id }, data: dto })
    await this.invalidateCache()
    return result
  }

  async deleteTestimonial(id: string) {
    await this.findTestimonialOrFail(id)
    await this.prisma.landingTestimonial.delete({ where: { id } })
    await this.invalidateCache()
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
    return result
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async findTestimonialOrFail(id: string) {
    const t = await this.prisma.landingTestimonial.findUnique({ where: { id } })
    if (!t) throw new NotFoundException(`Testimonio ${id} no encontrado`)
    return t
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
