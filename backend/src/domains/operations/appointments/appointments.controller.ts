import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { AppointmentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

class UpdateStatusDto {
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}

@Controller('appointments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('stats')
  @RequirePermission('appointments:view')
  getStats(@CurrentUser() user: { id: string }) {
    return this.appointmentsService.getStats(user.id);
  }

  @Get()
  @RequirePermission('appointments:view')
  findAll(
    @CurrentUser() user: { id: string },
    @Query() query: QueryAppointmentsDto
  ) {
    return this.appointmentsService.findAll(user.id, query);
  }

  @Get(':id')
  @RequirePermission('appointments:view')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.appointmentsService.findOne(user.id, id);
  }

  @Post()
  @RequirePermission('appointments:create')
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAppointmentDto
  ) {
    return this.appointmentsService.create(user.id, dto);
  }

  @Put(':id')
  @RequirePermission('appointments:edit')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto
  ) {
    return this.appointmentsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('appointments:delete')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.appointmentsService.remove(user.id, id);
  }

  @Patch(':id/status')
  @RequirePermission('appointments:edit')
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto
  ) {
    return this.appointmentsService.updateStatus(user.id, id, dto.status);
  }
}
