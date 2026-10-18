import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  RateLimitGuard,
  RateLimit,
} from '../../../common/guards/rate-limit.guard';
import { ProfileActivationsService } from './profile-activations.service';
import { CreateProfileActivationDto } from './dto/create-profile-activation.dto';
import { ReviewProfileActivationDto } from './dto/review-profile-activation.dto';
import { SetActiveProfileDto } from './dto/set-active-profile.dto';

@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller('profile-activations')
export class ProfileActivationsController {
  constructor(private readonly service: ProfileActivationsService) {}

  @Get('mine')
  getMine(@CurrentUser() user: any) {
    return this.service.getMine(user.id);
  }

  @Post()
  @RateLimit({
    windowMs: 60_000 * 60,
    maxRequests: 5,
    keyGenerator: (req) => `profile-activation:create:${(req as any).user?.id}`,
  })
  create(@CurrentUser() user: any, @Body() dto: CreateProfileActivationDto) {
    return this.service.create(user.id, dto);
  }

  // Contexto de UX activo ("estoy usando WorkPlace como...") — ver
  // ProfileActivationsService.setActive. No afecta permisos/capacidades.
  @Patch('active')
  setActive(@CurrentUser() user: any, @Body() dto: SetActiveProfileDto) {
    return this.service.setActive(user.id, dto.profileId);
  }

  @Patch(':id/deactivate')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) =>
      `profile-activation:deactivate:${(req as any).user?.id}`,
  })
  deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deactivate(user.id, id);
  }

  @Patch(':id/reactivate')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) =>
      `profile-activation:reactivate:${(req as any).user?.id}`,
  })
  reactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.reactivate(user.id, id);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get('admin/pending')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.findAllPending(parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch('admin/:id/review')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 30,
    keyGenerator: (req) => `profile-activation:review:${(req as any).user?.id}`,
  })
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewProfileActivationDto
  ) {
    return this.service.review(id, user.id, dto);
  }
}
