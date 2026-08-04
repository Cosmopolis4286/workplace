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
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AccountTypeGuard } from '../../../common/guards/account-type.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireAccountType } from '../../../common/decorators/require-account-type.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard, AccountTypeGuard)
@RequireAccountType('COMMERCE')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('stats')
  @RequirePermission('employees:view')
  getStats(@CurrentUser() user: { id: string }) {
    return this.employeesService.getStats(user.id);
  }

  @Get()
  @RequirePermission('employees:view')
  findAll(@CurrentUser() user: { id: string }) {
    return this.employeesService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermission('employees:view')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.employeesService.findOne(user.id, id);
  }

  @Post()
  @RequirePermission('employees:create')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.id, dto);
  }

  @Put(':id')
  @RequirePermission('employees:edit')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto
  ) {
    return this.employeesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('employees:delete')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.employeesService.remove(user.id, id);
  }

  @Patch(':id/toggle-status')
  @RequirePermission('employees:edit')
  toggleStatus(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.employeesService.toggleStatus(user.id, id);
  }
}
