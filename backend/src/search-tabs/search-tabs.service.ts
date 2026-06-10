import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSearchTabDto, UpdateSearchTabDto, ReorderSearchTabsDto } from './dto/search-tab.dto'

@Injectable()
export class SearchTabsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.searchTab.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async findEnabled() {
    return this.prisma.searchTab.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async findOne(id: string) {
    const tab = await this.prisma.searchTab.findUnique({ where: { id } })
    if (!tab) throw new NotFoundException(`Tab con ID "${id}" no encontrado`)
    return tab
  }

  async create(dto: CreateSearchTabDto) {
    const existing = await this.prisma.searchTab.findUnique({ where: { key: dto.key } })
    if (existing) throw new ConflictException(`Ya existe un tab con key "${dto.key}"`)

    const count = await this.prisma.searchTab.count()
    return this.prisma.searchTab.create({
      data: {
        key: dto.key,
        label: dto.label,
        icon: dto.icon ?? null,
        color: dto.color ?? '#EF4444',
        isEnabled: dto.isEnabled ?? true,
        sortOrder: dto.sortOrder ?? count,
      },
    })
  }

  async update(id: string, dto: UpdateSearchTabDto) {
    await this.findOne(id)
    return this.prisma.searchTab.update({ where: { id }, data: dto })
  }

  async toggleEnabled(id: string) {
    const tab = await this.findOne(id)
    return this.prisma.searchTab.update({
      where: { id },
      data: { isEnabled: !tab.isEnabled },
    })
  }

  async reorder(dto: ReorderSearchTabsDto) {
    await Promise.all(
      dto.ids.map((id, index) =>
        this.prisma.searchTab.update({ where: { id }, data: { sortOrder: index } }),
      ),
    )
    return this.findAll()
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.searchTab.delete({ where: { id } })
  }
}
