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
  NotFoundException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Fotos de recibos: pueden traer datos fiscales/bancarios del comercio, así que
// van fuera de uploads/ (público) y solo se sirven autenticadas al comercio
// dueño (GET /expenses/:id/receipt-image). Las viejas en uploads/expenses se
// siguen sirviendo por ese endpoint; la ruta pública está bloqueada en main.ts.
const RECEIPTS_DIR = join(process.cwd(), 'private-uploads', 'expenses');
const LEGACY_RECEIPTS_DIR = join(process.cwd(), 'uploads', 'expenses');
const PRIVATE_PREFIX = 'private-expense-receipts/';
const LEGACY_PREFIX = '/uploads/expenses/';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireModule } from '../../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IsEnum } from 'class-validator';
import { ExpenseStatus } from '@prisma/client';

class PatchStatusDto {
  @IsEnum(ExpenseStatus)
  status: ExpenseStatus;
}

@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule('expenses')
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
          if (!existsSync(RECEIPTS_DIR))
            mkdirSync(RECEIPTS_DIR, { recursive: true });
          cb(null, RECEIPTS_DIR);
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
      `${PRIVATE_PREFIX}${file.filename}`
    );
  }

  @Get(':id/receipt-image')
  @RequirePermission('expenses:view')
  async receiptImage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response
  ) {
    const commerceId = await this.expensesService.getCommerceId(user.id);
    const expense = await this.expensesService.findOne(id, commerceId);
    const receipt = expense.receipt ?? '';
    const [root, prefix] = receipt.startsWith(PRIVATE_PREFIX)
      ? [RECEIPTS_DIR, PRIVATE_PREFIX]
      : receipt.startsWith(LEGACY_PREFIX)
        ? [LEGACY_RECEIPTS_DIR, LEGACY_PREFIX]
        : [null, null];
    const filename = prefix ? receipt.slice(prefix.length) : '';
    // Solo el nombre de archivo generado al subir (sin rutas).
    if (!root || !/^[\w.-]+$/.test(filename)) {
      throw new NotFoundException('Este gasto no tiene foto de recibo');
    }
    return res.sendFile(filename, { root });
  }
}
