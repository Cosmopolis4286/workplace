import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePlanFeatureRuleDto } from './dto/create-plan-feature-rule.dto';
import { UpdatePlanFeatureRuleDto } from './dto/update-plan-feature-rule.dto';
import { AdminGrantFeatureDto } from './dto/admin-grant-feature.dto';
import { FeatureGrantSource, FeatureGrantStatus, FeatureUsageMode } from '@prisma/client';

@Injectable()
export class FeatureGrantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Plan feature rules (admin: qué puede activar cada plan) ────────────────

  async listRulesForPlan(planId: string) {
    return this.prisma.planFeatureRule.findMany({ where: { planId }, orderBy: { featureKey: 'asc' } });
  }

  async createRule(planId: string, dto: CreatePlanFeatureRuleDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const existing = await this.prisma.planFeatureRule.findUnique({
      where: { planId_featureKey: { planId, featureKey: dto.featureKey } },
    });
    if (existing) throw new ConflictException('Ya existe una regla para esta feature en este plan');

    return this.prisma.planFeatureRule.create({ data: { planId, ...dto } });
  }

  async updateRule(id: string, dto: UpdatePlanFeatureRuleDto) {
    const rule = await this.prisma.planFeatureRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Regla no encontrada');
    return this.prisma.planFeatureRule.update({ where: { id }, data: dto });
  }

  async deleteRule(id: string) {
    const rule = await this.prisma.planFeatureRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Regla no encontrada');
    await this.prisma.planFeatureRule.delete({ where: { id } });
    return { message: 'Regla eliminada correctamente' };
  }

  // ── Consulta central: ¿tiene esta feature activa ahora mismo? ──────────────
  // Único punto que cualquier guard/servicio debe consultar — evalúa
  // expiración y usos restantes en el momento, no confía en el `status`
  // guardado (que solo se actualiza de forma perezosa al consumir/consultar).

  async hasFeature(userId: string, featureKey: string): Promise<boolean> {
    const grant = await this.getActiveGrant(userId, featureKey);
    return grant !== null;
  }

  private async getActiveGrant(userId: string, featureKey: string) {
    const grant = await this.prisma.featureGrant.findFirst({
      where: { userId, featureKey, status: FeatureGrantStatus.ACTIVE },
      orderBy: { activatedAt: 'desc' },
    });
    if (!grant) return null;

    if (grant.expiresAt && grant.expiresAt < new Date()) {
      await this.prisma.featureGrant.update({
        where: { id: grant.id },
        data: { status: FeatureGrantStatus.EXPIRED },
      });
      return null;
    }

    if (grant.usageMode === FeatureUsageMode.MULTI_USE && grant.usesRemaining !== null && grant.usesRemaining <= 0) {
      await this.prisma.featureGrant.update({
        where: { id: grant.id },
        data: { status: FeatureGrantStatus.EXHAUSTED },
      });
      return null;
    }

    return grant;
  }

  // Consume un uso de una feature MULTI_USE (no-op para SINGLE_USE/REACTIVATABLE,
  // que no llevan contador de usos — su consumo es la expiración misma).
  async consumeUsage(userId: string, featureKey: string): Promise<boolean> {
    const grant = await this.getActiveGrant(userId, featureKey);
    if (!grant) return false;

    if (grant.usageMode !== FeatureUsageMode.MULTI_USE || grant.usesRemaining === null) {
      return true;
    }

    const usesRemaining = grant.usesRemaining - 1;
    await this.prisma.featureGrant.update({
      where: { id: grant.id },
      data: {
        usesRemaining,
        status: usesRemaining <= 0 ? FeatureGrantStatus.EXHAUSTED : FeatureGrantStatus.ACTIVE,
      },
    });
    return true;
  }

  // ── Activación por autoservicio (sigue una PlanFeatureRule) ─────────────────

  async activateSelfService(userId: string, featureKey: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      throw new NotFoundException('No tienes un plan activo con features disponibles');
    }

    const rule = await this.prisma.planFeatureRule.findFirst({
      where: { planId: subscription.planId, featureKey, active: true },
    });
    if (!rule) {
      throw new NotFoundException('Esta feature no está disponible en tu plan actual');
    }

    const existing = await this.getActiveGrant(userId, featureKey);
    if (existing) {
      throw new ConflictException('Ya tienes esta feature activa');
    }

    // SINGLE_USE: si alguna vez existió un grant de esta feature para este
    // usuario (activo o no), ya se consumió su única oportunidad — a
    // diferencia de REACTIVATABLE, que permite reactivar libremente.
    if (rule.usageMode === FeatureUsageMode.SINGLE_USE) {
      const everUsed = await this.prisma.featureGrant.findFirst({ where: { userId, featureKey } });
      if (everUsed) {
        throw new ConflictException('Esta feature es de un solo uso y ya la activaste antes');
      }
    }

    return this.createGrantFromRule(userId, rule, FeatureGrantSource.SELF_SERVICE, null);
  }

  private async createGrantFromRule(
    userId: string,
    rule: { id: string; featureKey: string; durationDays: number; usageMode: FeatureUsageMode; maxUses: number | null },
    source: FeatureGrantSource,
    grantedBy: string | null,
  ) {
    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt);
    expiresAt.setDate(expiresAt.getDate() + rule.durationDays);

    return this.prisma.featureGrant.create({
      data: {
        userId,
        featureKey: rule.featureKey,
        ruleId: rule.id,
        source,
        grantedBy,
        usageMode: rule.usageMode,
        usesRemaining: rule.usageMode === FeatureUsageMode.MULTI_USE ? rule.maxUses : null,
        activatedAt,
        expiresAt,
      },
    });
  }

  // ── Otorgamiento manual por admin (sin regla de plan) ───────────────────────

  async grantByAdmin(adminId: string, dto: AdminGrantFeatureDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt);
    expiresAt.setDate(expiresAt.getDate() + dto.durationDays);

    return this.prisma.featureGrant.create({
      data: {
        userId: dto.userId,
        featureKey: dto.featureKey,
        source: FeatureGrantSource.ADMIN,
        grantedBy: adminId,
        usageMode: dto.usageMode,
        usesRemaining: dto.usageMode === FeatureUsageMode.MULTI_USE ? dto.maxUses ?? null : null,
        activatedAt,
        expiresAt,
        notes: dto.notes,
      },
    });
  }

  async revoke(id: string) {
    const grant = await this.prisma.featureGrant.findUnique({ where: { id } });
    if (!grant) throw new NotFoundException('Activación no encontrada');
    return this.prisma.featureGrant.update({
      where: { id },
      data: { status: FeatureGrantStatus.REVOKED },
    });
  }

  // ── Lectura para el panel del usuario ───────────────────────────────────────

  async listMyGrants(userId: string) {
    return this.prisma.featureGrant.findMany({
      where: { userId },
      orderBy: { activatedAt: 'desc' },
    });
  }

  async listAvailableFeatures(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) return [];

    const rules = await this.prisma.planFeatureRule.findMany({
      where: { planId: subscription.planId, active: true },
    });

    return Promise.all(
      rules.map(async (rule) => ({
        ...rule,
        currentlyActive: await this.hasFeature(userId, rule.featureKey),
      })),
    );
  }
}
