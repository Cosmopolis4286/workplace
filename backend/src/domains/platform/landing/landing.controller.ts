import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { LandingService } from './landing.service'
import { CreateTestimonialDto } from './dto/create-testimonial.dto'
import { UpdateTestimonialDto } from './dto/update-testimonial.dto'
import { UpdateStatDto } from './dto/update-stat.dto'
import { CreateFeatureDto } from './dto/create-feature.dto'
import { UpdateFeatureDto } from './dto/update-feature.dto'
import { CreateStepDto } from './dto/create-step.dto'
import { UpdateStepDto } from './dto/update-step.dto'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { Roles } from '../../../common/decorators/roles.decorator'
import { Role } from '@prisma/client'

@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  // ─── Public — no auth ──────────────────────────────────────────────────────

  @Get('testimonials')
  getPublicTestimonials() {
    return this.landingService.getPublicTestimonials()
  }

  @Get('stats')
  getPublicStats() {
    return this.landingService.getPublicStats()
  }

  @Get('features')
  getPublicFeatures() {
    return this.landingService.getPublicFeatures()
  }

  @Get('steps')
  getPublicSteps() {
    return this.landingService.getPublicSteps()
  }

  // ─── Admin — Testimonials ──────────────────────────────────────────────────

  @Get('admin/testimonials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllTestimonials() {
    return this.landingService.findAllTestimonials()
  }

  @Post('admin/testimonials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.landingService.createTestimonial(dto)
  }

  @Put('admin/testimonials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.landingService.updateTestimonial(id, dto)
  }

  @Delete('admin/testimonials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteTestimonial(@Param('id') id: string) {
    return this.landingService.deleteTestimonial(id)
  }

  @Patch('admin/testimonials/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  reorderTestimonials(@Body('orderedIds') orderedIds: string[]) {
    return this.landingService.reorderTestimonials(orderedIds)
  }

  @Get('admin/testimonials/review-candidates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findVerifiedReviewCandidates() {
    return this.landingService.findVerifiedReviewCandidates()
  }

  @Post('admin/testimonials/from-review/:reviewId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createTestimonialFromReview(@Param('reviewId') reviewId: string) {
    return this.landingService.createTestimonialFromReview(reviewId)
  }

  // ─── Admin — Stats ─────────────────────────────────────────────────────────

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllStats() {
    return this.landingService.findAllStats()
  }

  @Patch('admin/stats/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  upsertStat(@Param('key') key: string, @Body() dto: UpdateStatDto) {
    return this.landingService.upsertStat(key, dto)
  }

  // ─── Admin — Features ──────────────────────────────────────────────────────

  @Get('admin/features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllFeatures() {
    return this.landingService.findAllFeatures()
  }

  @Post('admin/features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createFeature(@Body() dto: CreateFeatureDto) {
    return this.landingService.createFeature(dto)
  }

  @Put('admin/features/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateFeature(@Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    return this.landingService.updateFeature(id, dto)
  }

  @Delete('admin/features/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteFeature(@Param('id') id: string) {
    return this.landingService.deleteFeature(id)
  }

  // ─── Admin — Steps ─────────────────────────────────────────────────────────

  @Get('admin/steps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllSteps() {
    return this.landingService.findAllSteps()
  }

  @Post('admin/steps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createStep(@Body() dto: CreateStepDto) {
    return this.landingService.createStep(dto)
  }

  @Put('admin/steps/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateStep(@Param('id') id: string, @Body() dto: UpdateStepDto) {
    return this.landingService.updateStep(id, dto)
  }

  @Delete('admin/steps/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteStep(@Param('id') id: string) {
    return this.landingService.deleteStep(id)
  }
}
