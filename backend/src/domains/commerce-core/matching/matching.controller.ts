import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { RankCandidatesDto } from './dto/rank-candidates.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

// Endpoint standalone genérico: recibe candidatos ya resueltos por el caller
// (SearchService, y a futuro el AI Orchestrator) y devuelve el ranking
// combinado precio+distancia+reputación+disponibilidad — no conoce productos
// ni servicios, solo entidades COMMERCE/PROFESSIONAL. Ver matching.facade.ts
// para el contrato usado por consumidores internos (sin pasar por HTTP).
@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('rank')
  async rank(@Body() dto: RankCandidatesDto) {
    return this.matchingService.rankCandidates(dto.candidates, {
      origin: dto.origin ?? null,
    });
  }
}
