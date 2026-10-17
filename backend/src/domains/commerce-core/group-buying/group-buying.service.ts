import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PLATFORM_FEES_FACADE,
  PlatformFeesFacade,
} from '../../money/platform-fees/platform-fees.facade';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { GroupBuyingCampaignStatus, FeeTransactionType } from '@prisma/client';

interface PriceTier {
  minQuantity: number;
  unitPrice: number;
}

@Injectable()
export class GroupBuyingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLATFORM_FEES_FACADE)
    private readonly platformFees: PlatformFeesFacade
  ) {}

  // ── Campañas ─────────────────────────────────────────────────────────────────

  async createCampaign(organizerId: string, dto: CreateCampaignDto) {
    const sortedTiers = [...dto.priceTiers].sort(
      (a, b) => a.minQuantity - b.minQuantity
    );
    for (let i = 1; i < sortedTiers.length; i++) {
      if (sortedTiers[i].minQuantity === sortedTiers[i - 1].minQuantity) {
        throw new BadRequestException(
          'No puede haber dos tramos de precio con la misma cantidad mínima'
        );
      }
    }
    if (new Date(dto.deadline) <= new Date()) {
      throw new BadRequestException('La fecha límite debe ser futura');
    }

    return this.prisma.groupBuyingCampaign.create({
      data: {
        organizerId,
        title: dto.title,
        description: dto.description,
        unit: dto.unit,
        currencyCode: dto.currencyCode.toUpperCase(),
        priceTiers: sortedTiers as any,
        deadline: new Date(dto.deadline),
      },
    });
  }

  async listOpen() {
    const campaigns = await this.prisma.groupBuyingCampaign.findMany({
      where: {
        status: GroupBuyingCampaignStatus.OPEN,
        deadline: { gt: new Date() },
      },
      include: {
        organizer: { select: { id: true, firstName: true, lastName: true } },
        pledges: { where: { cancelled: false }, select: { quantity: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    return campaigns.map((c) => this.withComputedFields(c));
  }

  async getCampaign(id: string) {
    const campaign = await this.prisma.groupBuyingCampaign.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, firstName: true, lastName: true } },
        pledges: {
          include: { commerce: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return this.withComputedFields(campaign);
  }

  async close(id: string, organizerId: string) {
    const campaign = await this.prisma.groupBuyingCampaign.findUnique({
      where: { id },
      include: { pledges: { where: { cancelled: false } } },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.organizerId !== organizerId) {
      throw new ForbiddenException(
        'Solo el organizador puede cerrar esta campaña'
      );
    }
    if (campaign.status !== GroupBuyingCampaignStatus.OPEN) {
      throw new BadRequestException('Solo se puede cerrar una campaña abierta');
    }

    const totalQuantity = campaign.pledges.reduce(
      (sum, p) => sum + p.quantity,
      0
    );
    const tier = this.resolveTier(
      campaign.priceTiers as unknown as PriceTier[],
      totalQuantity
    );

    const feeConfig = await this.platformFees.resolveFeeConfig(
      FeeTransactionType.GROUP_BUYING,
      organizerId
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.groupBuyingCampaign.update({
        where: { id },
        data: { status: GroupBuyingCampaignStatus.CLOSED },
      });

      if (feeConfig && tier) {
        for (const pledge of campaign.pledges) {
          const baseAmount = pledge.quantity * tier.unitPrice;
          const { feeAmount } = this.platformFees.calculateFee(
            baseAmount,
            feeConfig
          );
          await tx.pledge.update({
            where: { id: pledge.id },
            data: {
              platformFeeRate: feeConfig.rate,
              platformFeeAmount: feeAmount,
            },
          });
        }
      }
    });

    return this.getCampaign(id);
  }

  async cancel(id: string, organizerId: string) {
    const campaign = await this.prisma.groupBuyingCampaign.findUnique({
      where: { id },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.organizerId !== organizerId) {
      throw new ForbiddenException(
        'Solo el organizador puede cancelar esta campaña'
      );
    }
    if (campaign.status !== GroupBuyingCampaignStatus.OPEN) {
      throw new BadRequestException(
        'Solo se puede cancelar una campaña abierta'
      );
    }
    return this.prisma.groupBuyingCampaign.update({
      where: { id },
      data: { status: GroupBuyingCampaignStatus.CANCELLED },
    });
  }

  // ── Pledges ──────────────────────────────────────────────────────────────────

  async pledge(campaignId: string, commerceId: string, dto: CreatePledgeDto) {
    const campaign = await this.prisma.groupBuyingCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.status !== GroupBuyingCampaignStatus.OPEN) {
      throw new BadRequestException(
        'Esta campaña ya no acepta nuevos compromisos'
      );
    }
    if (campaign.deadline <= new Date()) {
      throw new BadRequestException('El plazo de esta campaña ya venció');
    }

    const existing = await this.prisma.pledge.findUnique({
      where: { campaignId_commerceId: { campaignId, commerceId } },
    });
    if (existing && !existing.cancelled) {
      throw new BadRequestException(
        'Ya tienes un compromiso activo en esta campaña — edítalo en vez de crear uno nuevo'
      );
    }

    if (existing) {
      return this.prisma.pledge.update({
        where: { id: existing.id },
        data: { quantity: dto.quantity, cancelled: false },
      });
    }

    return this.prisma.pledge.create({
      data: { campaignId, commerceId, quantity: dto.quantity },
    });
  }

  async cancelPledge(campaignId: string, commerceId: string) {
    const campaign = await this.prisma.groupBuyingCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    if (campaign.status !== GroupBuyingCampaignStatus.OPEN) {
      throw new BadRequestException(
        'Solo se puede retirar un compromiso de una campaña abierta'
      );
    }

    const pledge = await this.prisma.pledge.findUnique({
      where: { campaignId_commerceId: { campaignId, commerceId } },
    });
    if (!pledge || pledge.cancelled)
      throw new NotFoundException(
        'No tienes un compromiso activo en esta campaña'
      );

    return this.prisma.pledge.update({
      where: { id: pledge.id },
      data: { cancelled: true },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // El tramo aplicable es el de mayor minQuantity que sea <= la cantidad
  // total acumulada — más volumen agregado nunca empeora el precio de nadie.
  private resolveTier(
    tiers: PriceTier[],
    totalQuantity: number
  ): PriceTier | null {
    const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
    let applicable: PriceTier | null = null;
    for (const tier of sorted) {
      if (totalQuantity >= tier.minQuantity) applicable = tier;
    }
    return applicable;
  }

  private withComputedFields<
    T extends {
      priceTiers: unknown;
      pledges: Array<{ quantity: number; cancelled?: boolean }>;
    },
  >(campaign: T) {
    const activePledges = campaign.pledges.filter((p) => p.cancelled !== true);
    const totalQuantity = activePledges.reduce((sum, p) => sum + p.quantity, 0);
    const currentTier = this.resolveTier(
      campaign.priceTiers as unknown as PriceTier[],
      totalQuantity
    );
    const nextTier =
      (campaign.priceTiers as unknown as PriceTier[])
        .filter((t) => t.minQuantity > totalQuantity)
        .sort((a, b) => a.minQuantity - b.minQuantity)[0] ?? null;

    return {
      ...campaign,
      totalQuantity,
      currentUnitPrice: currentTier?.unitPrice ?? null,
      nextTier: nextTier
        ? { ...nextTier, unitsToUnlock: nextTier.minQuantity - totalQuantity }
        : null,
    };
  }
}
