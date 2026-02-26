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
} from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { QueryAppointmentsDto } from './dto/query-appointments.dto'
import { AppointmentStatus } from '@prisma/client'
import { IsEnum } from 'class-validator'

class UpdateStatusDto {
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus
}

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('stats')
  getStats(@CurrentUser() user: { id: string }) {
    return this.appointmentsService.getStats(user.id)
  }

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Query() query: QueryAppointmentsDto,
  ) {
    return this.appointmentsService.findAll(user.id, query)
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.appointmentsService.findOne(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user.id, dto)
  }

  @Put(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.appointmentsService.remove(user.id, id)
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.appointmentsService.updateStatus(user.id, id, dto.status)
  }
}
