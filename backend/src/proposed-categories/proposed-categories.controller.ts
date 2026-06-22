import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ProposedCategoriesService } from './proposed-categories.service';
import { ProposeCategoryDto } from './dto/propose-category.dto';
import { ReviewProposedCategoryDto } from './dto/review-proposed-category.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, RateLimitGuard)
@Controller('proposed-categories')
export class ProposedCategoriesController {
  constructor(private readonly proposedCategoriesService: ProposedCategoriesService) {}

  @Post()
  @RequirePermission('categories_user:propose')
  @RateLimit({ windowMs: 60_000 * 60, maxRequests: 10, keyGenerator: (req) => `categories_user:propose:${(req as any).user?.id}` })
  propose(@CurrentUser() user: any, @Body() dto: ProposeCategoryDto) {
    return this.proposedCategoriesService.propose(user.id, dto);
  }

  @Get('me')
  @RequirePermission('categories_user:propose')
  findMine(@CurrentUser() user: any) {
    return this.proposedCategoriesService.findMine(user.id);
  }

  @Get('admin/pending')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.proposedCategoriesService.findAllPending(parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch('admin/:id/review')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req) => `categories_user:review:${(req as any).user?.id}` })
  review(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: ReviewProposedCategoryDto) {
    return this.proposedCategoriesService.review(id, user.id, dto);
  }
}
