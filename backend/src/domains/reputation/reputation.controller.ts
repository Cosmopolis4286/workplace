import { Controller, Get, Param, ParseEnumPipe } from '@nestjs/common';
import { ReputationEntityType } from '@prisma/client';
import { ReputationService } from './reputation.service';

// Lectura pública, sin guard — el score es información pública del perfil,
// igual que Commerce.avgRating hoy (ver /profiles y /loja/:slug).
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get(':entityType/:entityId')
  async getScore(
    @Param('entityType', new ParseEnumPipe(ReputationEntityType)) entityType: ReputationEntityType,
    @Param('entityId') entityId: string,
  ) {
    const score = await this.reputation.getScore(entityType, entityId);
    // null (sin historial todavía) es una respuesta válida, no un 404 — el
    // frontend debe poder mostrar "Nuevo" sin tratarlo como error.
    return score;
  }
}
