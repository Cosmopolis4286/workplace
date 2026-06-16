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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
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
}
