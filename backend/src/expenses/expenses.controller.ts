import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, Query, UseGuards,
} from '@nestjs/common'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { QueryExpensesDto } from './dto/query-expenses.dto'
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto'
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { IsEnum } from 'class-validator'
import { ExpenseStatus } from '@prisma/client'

class PatchStatusDto {
  @IsEnum(ExpenseStatus)
  status: ExpenseStatus
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ── Stats ──────────────────────────────────────────────────────────────────

  @Get('stats')
  @RequirePermission('expenses:view')
  getStats(@CurrentUser() user: any) {
    return this.expensesService.getStats(user.restaurantId)
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermission('expenses:view')
  findAllCategories(@CurrentUser() user: any) {
    return this.expensesService.findAllCategories(user.restaurantId)
  }

  @Post('categories')
  @RequirePermission('expenses:create')
  createCategory(@CurrentUser() user: any, @Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(user.restaurantId, dto)
  }

  @Put('categories/:id')
  @RequirePermission('expenses:edit')
  updateCategory(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expensesService.updateCategory(id, user.restaurantId, dto)
  }

  @Delete('categories/:id')
  @RequirePermission('expenses:delete')
  removeCategory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expensesService.removeCategory(id, user.restaurantId)
  }

  // ── Expenses ───────────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('expenses:view')
  findAll(@CurrentUser() user: any, @Query() query: QueryExpensesDto) {
    return this.expensesService.findAll(user.restaurantId, query)
  }

  @Get(':id')
  @RequirePermission('expenses:view')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expensesService.findOne(id, user.restaurantId)
  }

  @Post()
  @RequirePermission('expenses:create')
  create(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.restaurantId, dto)
  }

  @Put(':id')
  @RequirePermission('expenses:edit')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, user.restaurantId, dto)
  }

  @Patch(':id/status')
  @RequirePermission('expenses:edit')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: PatchStatusDto,
  ) {
    return this.expensesService.updateStatus(id, user.restaurantId, dto.status)
  }

  @Delete(':id')
  @RequirePermission('expenses:delete')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expensesService.remove(id, user.restaurantId)
  }
}
