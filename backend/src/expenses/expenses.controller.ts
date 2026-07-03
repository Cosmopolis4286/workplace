import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsEnum } from 'class-validator';
import { ExpenseStatus } from '@prisma/client';

class PatchStatusDto {
  @IsEnum(ExpenseStatus)
  status: ExpenseStatus;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ── Stats ──────────────────────────────────────────────────────────────────

  @Get('stats')
  @RequirePermission('expenses:view')
  async getStats(@CurrentUser() user: any) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.getStats(commerceId);
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermission('expenses:view')
  async findAllCategories(@CurrentUser() user: any) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.findAllCategories(commerceId);
  }

  @Post('categories')
  @RequirePermission('expenses:create')
  async createCategory(
    @CurrentUser() user: any,
    @Body() dto: CreateExpenseCategoryDto
  ) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.createCategory(commerceId, dto);
  }

  @Put('categories/:id')
  @RequirePermission('expenses:edit')
  async updateCategory(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateExpenseCategoryDto
  ) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.updateCategory(id, commerceId, dto);
  }

  @Delete('categories/:id')
  @RequirePermission('expenses:delete')
  async removeCategory(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.removeCategory(id, commerceId);
  }

  // ── Expenses ───────────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('expenses:view')
  async findAll(@CurrentUser() user: any, @Query() query: QueryExpensesDto) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.findAll(commerceId, query);
  }

  @Get(':id')
  @RequirePermission('expenses:view')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.findOne(id, commerceId);
  }

  @Post()
  @RequirePermission('expenses:create')
  async create(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.create(commerceId, dto);
  }

  @Put(':id')
  @RequirePermission('expenses:edit')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateExpenseDto
  ) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.update(id, commerceId, dto);
  }

  @Patch(':id/status')
  @RequirePermission('expenses:edit')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: PatchStatusDto
  ) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.updateStatus(id, commerceId, dto.status);
  }

  @Delete(':id')
  @RequirePermission('expenses:delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.remove(id, commerceId);
  }

  @Post(':id/receipt')
  @RequirePermission('expenses:edit')
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'expenses');
          if (!existsSync(uploadPath))
            mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes (jpeg, png, webp, gif)'
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    })
  )
  async uploadReceipt(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const commerceId = await this.expensesService.getCommerceId(user.id);
    return this.expensesService.updateReceipt(
      id,
      commerceId,
      `/uploads/expenses/${file.filename}`
    );
  }
}
