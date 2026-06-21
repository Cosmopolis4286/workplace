import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('suggest')
  @UseGuards(OptionalJwtAuthGuard)
  @RateLimit({
    windowMs: 10_000,
    maxRequests: 20,
    keyGenerator: (req) => `search:suggest:${req.ip}`,
  })
  suggest(@Query('q') q?: string) {
    return this.searchService.suggest(q);
  }
}
