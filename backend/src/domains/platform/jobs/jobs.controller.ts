import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JobsService, type CreateJobDto, type UpdateJobDto, type JobQuery, type CreateJobCategoryDto } from './jobs.service'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../common/guards/permissions.guard'
import { RolesGuard } from '../../../common/guards/roles.guard'
import { KycApprovedGuard } from '../../../common/guards/kyc-approved.guard'
import { CategoryScopeGuard } from '../../../common/guards/category-scope.guard'
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard'
import { RequirePermission } from '../../../common/decorators/require-permission.decorator'
import { RequireCategoryScope } from '../../../common/decorators/require-category-scope.decorator'
import { Roles } from '../../../common/decorators/roles.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RateLimit } from '../../../common/guards/rate-limit.guard'
import { Role } from '@prisma/client'
import type { JobApplicationStatus } from '@prisma/client'

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ─── Categories (Public) ──────────────────────────────────────────────────────

  // scoped=true: usado por el selector del formulario "Nueva Vacante", no
  // por la búsqueda pública de empleos — ver JobsService.getCategories().
  @Get('categories')
  @UseGuards(OptionalJwtAuthGuard)
  async getCategories(
    @CurrentUser() user?: { id: string; role: Role },
    @Query('scoped') scoped?: string,
  ) {
    return { data: await this.jobsService.getCategories(user, scoped === 'true') }
  }

  // ─── Categories (Admin CRUD) ──────────────────────────────────────────────────

  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async getAdminCategories() {
    return { data: await this.jobsService.getAdminCategories() }
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async createCategory(@Body() dto: CreateJobCategoryDto) {
    return { data: await this.jobsService.createCategory(dto) }
  }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async updateCategory(@Param('id') id: string, @Body() dto: Partial<CreateJobCategoryDto>) {
    return { data: await this.jobsService.updateCategory(id, dto) }
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async deleteCategory(@Param('id') id: string) {
    await this.jobsService.deleteCategory(id)
    return { success: true }
  }

  // ─── Catalog (Public) ───────────────────────────────────────────────────────

  @Get('catalog')
  async getCatalog(
    @Query() query: JobQuery,
  ) {
    return this.jobsService.getCatalogJobs(query)
  }

  @Get('catalog/stats')
  async getCatalogStats() {
    return { data: await this.jobsService.getCatalogStats() }
  }

  @Get('catalog/tags')
  async getCatalogTags(@Query('q') q?: string) {
    return { data: await this.jobsService.getPopularTags(q) }
  }

  // ─── Single Job (Public) ──────────────────────────────────────────────────────

  @Get(':id')
  async getJob(@Param('id') id: string) {
    const job = await this.jobsService.getJobById(id)
    if (!job) return { error: 'Empleo no encontrado' }
    return { data: job }
  }

  // ─── My Jobs (Authenticated) ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('mine/all')
  async getMyJobs(@CurrentUser() user: { id: string }) {
    return { data: await this.jobsService.getMyJobs(user.id) }
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/stats')
  async getMyJobsStats(@CurrentUser() user: { id: string }) {
    return await this.jobsService.getMyJobsStats(user.id)
  }

  // ─── CRUD (Authenticated) ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, PermissionsGuard, KycApprovedGuard, CategoryScopeGuard)
  @RequirePermission('jobs:create')
  @RequireCategoryScope({ model: 'jobCategory', bodyField: 'categoryId' })
  @RateLimit({ windowMs: 60_000, maxRequests: 10, keyGenerator: (req) => `jobs:create:${(req as any).user?.id}` })
  @Post()
  async createJob(@Body() dto: CreateJobDto, @CurrentUser() user: { id: string }) {
    return { data: await this.jobsService.createJob(user.id, dto) }
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, CategoryScopeGuard)
  @RequirePermission('jobs:edit')
  @RequireCategoryScope({ model: 'jobCategory', bodyField: 'categoryId' })
  @Patch(':id')
  async updateJob(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: { id: string },
  ) {
    return { data: await this.jobsService.updateJob(id, user.id, dto) }
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:delete')
  @Delete(':id')
  async deleteJob(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.jobsService.deleteJob(id, user.id)
    return { success: true }
  }

  // ─── Applications (Authenticated) ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, PermissionsGuard, KycApprovedGuard)
  @RequirePermission('jobs:view')
  @RateLimit({ windowMs: 60_000, maxRequests: 20, keyGenerator: (req) => `jobs:apply:${(req as any).user?.id}` })
  @Post('applications')
  async createApplication(
    @Body() dto: { jobId: string; coverLetter?: string; phone?: string; email?: string },
    @CurrentUser() user: { id: string },
  ) {
    return { data: await this.jobsService.createApplication(user.id, dto) }
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:view')
  @Get('applications/mine')
  async getMyApplications(@CurrentUser() user: { id: string }) {
    return { data: await this.jobsService.getMyApplications(user.id) }
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:edit')
  @Get(':id/applications')
  async getJobApplications(@Param('id') jobId: string, @CurrentUser() user: { id: string }) {
    return { data: await this.jobsService.getJobApplications(jobId, user.id) }
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:edit')
  @Patch('applications/:id/status')
  async updateApplicationStatus(
    @Param('id') applicationId: string,
    @Body('status') status: JobApplicationStatus,
    @CurrentUser() user: { id: string },
  ) {
    return {
      data: await this.jobsService.updateApplicationStatus(
        applicationId,
        user.id,
        status,
      ),
    }
  }
}
