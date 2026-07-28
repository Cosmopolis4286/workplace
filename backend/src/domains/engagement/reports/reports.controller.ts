import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ModerateReportDto } from './dto/moderate-report.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: any) {
    return this.reportsService.listMine(user.id);
  }

  // ─── Moderación ─────────────────────────────────────────────────────────────

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reviews:moderate')
  listAll(@Query('status') status?: string) {
    return this.reportsService.listAll(status);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reviews:moderate')
  moderate(@Param('id') id: string, @Body() dto: ModerateReportDto) {
    return this.reportsService.moderate(id, dto);
  }
}
