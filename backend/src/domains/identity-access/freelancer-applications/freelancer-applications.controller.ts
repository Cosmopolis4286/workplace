import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RateLimitGuard, RateLimit } from '../../../common/guards/rate-limit.guard';
import { FreelancerApplicationsService } from './freelancer-applications.service';
import { CreateFreelancerApplicationDto } from './dto/create-freelancer-application.dto';
import { ReviewFreelancerApplicationDto } from './dto/review-freelancer-application.dto';

@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller('freelancer-applications')
export class FreelancerApplicationsController {
  constructor(private readonly service: FreelancerApplicationsService) {}

  @Get('mine')
  getMine(@CurrentUser() user: any) {
    return this.service.getMine(user.id);
  }

  @Post()
  @RateLimit({ windowMs: 60_000 * 60, maxRequests: 3, keyGenerator: (req) => `freelancer-app:create:${(req as any).user?.id}` })
  create(@CurrentUser() user: any, @Body() dto: CreateFreelancerApplicationDto) {
    return this.service.create(user.id, dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get('admin/pending')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.findAllPending(parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch('admin/:id/review')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req) => `freelancer-app:review:${(req as any).user?.id}` })
  review(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: ReviewFreelancerApplicationDto) {
    return this.service.review(id, user.id, dto);
  }
}
