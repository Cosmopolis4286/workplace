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
import { JobsService, type CreateJobDto, type UpdateJobDto, type JobQuery } from './jobs.service'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../common/guards/permissions.guard'
import { RequirePermission } from '../../../common/decorators/require-permission.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import type { JobApplicationStatus } from '@prisma/client'

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ─── Categories (Public) ──────────────────────────────────────────────────────

  @Get('categories')
  async getCategories() {
    return { data: await this.jobsService.getCategories() }
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:create')
  @Post()
  async createJob(@Body() dto: CreateJobDto, @CurrentUser() user: { id: string }) {
    return { data: await this.jobsService.createJob(user.id, dto) }
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('jobs:edit')
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

  @UseGuards(JwtAuthGuard)
  @Post('applications')
  async createApplication(
    @Body() dto: { jobId: string; coverLetter?: string; phone?: string; email?: string },
    @CurrentUser() user: { id: string },
  ) {
    return { data: await this.jobsService.createApplication(user.id, dto) }
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/mine')
  async getMyApplications(@CurrentUser() user: { id: string }) {
    return { data: await this.jobsService.getMyApplications(user.id) }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/applications')
  async getJobApplications(@Param('id') jobId: string, @CurrentUser() user: { id: string }) {
    return { data: await this.jobsService.getJobApplications(jobId, user.id) }
  }

  @UseGuards(JwtAuthGuard)
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
