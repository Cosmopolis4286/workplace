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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireModule } from '../../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Controller('menu')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleAccessGuard)
@RequireModule('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermission('menu:view')
  getCategories(@CurrentUser() user: { id: string }) {
    return this.menuService.getCategories(user.id);
  }

  @Post('categories')
  @RequirePermission('menu:create')
  createCategory(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCategoryDto
  ) {
    return this.menuService.createCategory(user.id, dto);
  }

  @Put('categories/:id')
  @RequirePermission('menu:edit')
  updateCategory(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.menuService.updateCategory(user.id, id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('menu:delete')
  deleteCategory(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.deleteCategory(user.id, id);
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  @Get('products')
  @RequirePermission('menu:view')
  getProducts(@CurrentUser() user: { id: string }, @Query() query: QueryProductsDto) {
    return this.menuService.getProducts(user.id, query);
  }

  // Nota: protegido por menu:view igual que el resto de /menu/products —
  // el sidebar gatea la página /inventory con inventory:view, así que
  // ambos permisos deben concederse juntos a cualquier rol/perfil que
  // necesite ver Inventario (hoy siempre es así en el seed). Ver auditoría
  // de reportes que motivó este comentario.
  @Get('products/stats')
  @RequirePermission('menu:view')
  getProductsStats(@CurrentUser() user: { id: string }) {
    return this.menuService.getProductsStats(user.id);
  }

  // Catálogo completo (sin paginar) para el selector de producto al crear
  // una venta — ese flujo necesita poder buscar en TODO el inventario, no
  // solo la página visible de /inventory.
  @Get('products/selector')
  @RequirePermission('menu:view')
  getProductsForSelector(
    @CurrentUser() user: { id: string },
    @Query('search') search?: string,
  ) {
    return this.menuService.getProductsForSelector(user.id, search);
  }

  // Catálogo completo (sin paginar) con todos los campos, para exportación
  // CSV desde /inventory — separado de GET /products (paginado) porque
  // exportar debe incluir siempre TODOS los productos, no solo la página visible.
  @Get('products/export')
  @RequirePermission('menu:view')
  getProductsForExport(@CurrentUser() user: { id: string }) {
    return this.menuService.getProductsForExport(user.id);
  }

  @Get('categories/:id/products')
  @RequirePermission('menu:view')
  getProductsByCategory(
    @CurrentUser() user: { id: string },
    @Param('id') id: string
  ) {
    return this.menuService.getProductsByCategory(user.id, id);
  }

  @Post('products')
  @RequirePermission('menu:create')
  createProduct(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProductDto
  ) {
    return this.menuService.createProduct(user.id, dto);
  }

  @Post('bundles')
  @RequirePermission('menu:create')
  createBundle(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateBundleDto
  ) {
    return this.menuService.createBundle(user.id, dto);
  }

  @Put('products/:id')
  @RequirePermission('menu:edit')
  updateProduct(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.menuService.updateProduct(user.id, id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('menu:delete')
  deleteProduct(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.deleteProduct(user.id, id);
  }

  @Patch('products/:id/stock')
  @RequirePermission('inventory:edit')
  updateStock(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateStockDto
  ) {
    return this.menuService.updateStock(user.id, id, dto);
  }

  @Patch('products/:id/toggle-status')
  @RequirePermission('menu:edit')
  toggleProductStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string
  ) {
    return this.menuService.toggleProductStatus(user.id, id);
  }

  @Post('products/:id/image')
  @RequirePermission('menu:edit')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'products');
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
  uploadProductImage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.menuService.updateProductImage(
      user.id,
      id,
      `/uploads/products/${file.filename}`
    );
  }
}
