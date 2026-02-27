import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { EmployeesService } from './employees.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('stats')
  getStats(@CurrentUser() user: { id: string }) {
    return this.employeesService.getStats(user.id)
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.employeesService.findAll(user.id)
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.employeesService.findOne(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.id, dto)
  }

  @Put(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.employeesService.remove(user.id, id)
  }

  @Patch(':id/toggle-status')
  toggleStatus(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.employeesService.toggleStatus(user.id, id)
  }
}
