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
  Request,
} from '@nestjs/common'
import { JobsService, type CreateJobDto, type UpdateJobDto, type JobQuery } from './jobs.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
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
  async getMyJobs(@Request() req) {
    return { data: await this.jobsService.getMyJobs(req.user.userId) }
  }

  // ─── CRUD (Authenticated) ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post()
  async createJob(@Body() dto: CreateJobDto, @Request() req) {
    return { data: await this.jobsService.createJob(req.user.userId, dto) }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateJob(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @Request() req,
  ) {
    return { data: await this.jobsService.updateJob(id, req.user.userId, dto) }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteJob(@Param('id') id: string, @Request() req) {
    await this.jobsService.deleteJob(id, req.user.userId)
    return { success: true }
  }

  // ─── Applications (Authenticated) ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('applications')
  async createApplication(
    @Body() dto: { jobId: string; coverLetter?: string; phone?: string; email?: string },
    @Request() req,
  ) {
    return { data: await this.jobsService.createApplication(req.user.userId, dto) }
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/mine')
  async getMyApplications(@Request() req) {
    return { data: await this.jobsService.getMyApplications(req.user.userId) }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/applications')
  async getJobApplications(@Param('id') jobId: string, @Request() req) {
    return { data: await this.jobsService.getJobApplications(jobId, req.user.userId) }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('applications/:id/status')
  async updateApplicationStatus(
    @Param('id') applicationId: string,
    @Body('status') status: JobApplicationStatus,
    @Request() req,
  ) {
    return {
      data: await this.jobsService.updateApplicationStatus(
        applicationId,
        req.user.userId,
        status,
      ),
    }
  }
}
