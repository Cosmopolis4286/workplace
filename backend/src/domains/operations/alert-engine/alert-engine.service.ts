import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertType } from '@prisma/client';
import { UpsertAlertRuleDto } from './dto/upsert-alert-rule.dto';

// Default de fábrica por tipo de alerta — usado cuando un comercio no
// personalizó su propio AlertRule. Mismos valores que ya estaban hardcodeados
// antes de generalizar el motor (ver PurchasesService.checkMarginDrop),
// documentados acá en vez de duplicados en cada servicio de negocio.
const ALERT_DEFAULTS: Record<AlertType, number> = {
  MARGIN_DROP: 5, // puntos porcentuales de caída de margen
  REPLACEMENT_COST_RISK: 10, // % de aumento de costo de reposición
  SUPPLIER_PRICE_CHANGE: 8, // % de aumento de precio de un proveedor
  LOW_LIQUIDITY: 20, // % de cuentas por cobrar/pagar vencidas
};

@Injectable()
export class AlertEngineService {
  constructor(private readonly prisma: PrismaService) {}

  // Umbral efectivo para un tipo de alerta en un comercio: la regla propia si
  // existe y está habilitada, si no el default de fábrica. Un comercio con
  // regla explícita `enabled: false` no dispara esa alerta nunca (shouldFire
  // ya lo maneja devolviendo false directo, sin llegar a comparar threshold).
  async getThreshold(commerceId: string, alertType: AlertType): Promise<number> {
    const rule = await this.prisma.alertRule.findUnique({
      where: { commerceId_alertType: { commerceId, alertType } },
    });
    if (rule && rule.enabled) return rule.thresholdValue;
    return ALERT_DEFAULTS[alertType];
  }

  // Punto único que un servicio de negocio consulta: "¿este valor amerita
  // disparar la alerta X para este comercio?" — encapsula la lectura de la
  // regla (o default) y la comparación, para que MARGIN_DROP/SUPPLIER_PRICE_CHANGE/etc.
  // no reimplementen "leer threshold, comparar" cada uno por su cuenta.
  async shouldFire(commerceId: string, alertType: AlertType, observedValue: number): Promise<boolean> {
    const rule = await this.prisma.alertRule.findUnique({
      where: { commerceId_alertType: { commerceId, alertType } },
    });
    if (rule && !rule.enabled) return false;

    const threshold = rule?.thresholdValue ?? ALERT_DEFAULTS[alertType];
    return observedValue >= threshold;
  }

  // ── Configuración por comercio (autoservicio) ───────────────────────────────

  async listRules(commerceId: string) {
    const existing = await this.prisma.alertRule.findMany({ where: { commerceId } });
    const existingByType = new Map(existing.map((r) => [r.alertType, r]));

    // Devuelve las 4 alertas siempre, aunque el comercio no haya personalizado
    // ninguna — el frontend necesita mostrar "MARGIN_DROP: 5% (default)" sin
    // que el comercio tenga que crear la fila primero para verla.
    return Object.values(AlertType).map((alertType) => {
      const rule = existingByType.get(alertType);
      return {
        alertType,
        thresholdValue: rule?.thresholdValue ?? ALERT_DEFAULTS[alertType],
        enabled: rule?.enabled ?? true,
        isDefault: !rule,
      };
    });
  }

  async upsertRule(commerceId: string, dto: UpsertAlertRuleDto) {
    return this.prisma.alertRule.upsert({
      where: { commerceId_alertType: { commerceId, alertType: dto.alertType } },
      create: {
        commerceId,
        alertType: dto.alertType,
        thresholdValue: dto.thresholdValue,
        enabled: dto.enabled ?? true,
      },
      update: {
        thresholdValue: dto.thresholdValue,
        enabled: dto.enabled ?? true,
      },
    });
  }

  // Vuelve una alerta a su default de fábrica (borra la personalización).
  async resetRule(commerceId: string, alertType: AlertType) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { commerceId_alertType: { commerceId, alertType } },
    });
    if (!rule) throw new NotFoundException('No hay una regla personalizada para restablecer');
    await this.prisma.alertRule.delete({ where: { id: rule.id } });
    return { alertType, thresholdValue: ALERT_DEFAULTS[alertType], enabled: true, isDefault: true };
  }
}
