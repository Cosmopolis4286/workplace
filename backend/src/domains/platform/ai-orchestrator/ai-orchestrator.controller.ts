import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { KycApprovedGuard } from '../../../common/guards/kyc-approved.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RateLimit } from '../../../common/guards/rate-limit.guard';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { SearchNeedDto } from './dto/search-need.dto';
import { ConfirmNeedDto } from './dto/confirm-need.dto';

@Controller('ai/needs')
@UseGuards(JwtAuthGuard)
export class AiOrchestratorController {
  constructor(private readonly aiOrchestratorService: AiOrchestratorService) {}

  // Base sin LLM del "AI Agent orquestador" (WORKPLACE_VISION.md §4/§16) —
  // recibe la necesidad ya estructurada (categoryId/budgetMax), no texto
  // libre todavía. Mismo rate limit que jobs:apply — protege contra un
  // futuro cliente (o LLM) que llame en loop.
  @Post('search')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 20,
    keyGenerator: (req) => `ai:needs:search:${(req as any).user?.id}`,
  })
  search(@Body() dto: SearchNeedDto, @CurrentUser() user: { id: string }) {
    return this.aiOrchestratorService.searchNeed(user.id, dto);
  }

  // KYC requerido: esto termina creando una ServiceRequest real, mismo
  // requisito que POST /services/requests.
  @Post('confirm')
  @UseGuards(KycApprovedGuard)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `ai:needs:confirm:${(req as any).user?.id}`,
  })
  confirm(@Body() dto: ConfirmNeedDto, @CurrentUser() user: { id: string }) {
    return this.aiOrchestratorService.confirmNeed(user.id, dto);
  }
}
