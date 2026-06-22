import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Role, ServiceEventType } from '@prisma/client';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServicesDto } from './dto/query-services.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { extensionForMimetype } from '../common/utils/upload-extension.util';

const ALLOWED_MEDIA_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // ─── Catalog (public) ─────────────────────────────────────────────────────

  @Get('catalog/categories')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalogCategories() {
    return this.servicesService.getCatalogCategories();
  }

  @Get('catalog/providers')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalogProviders() {
    return this.servicesService.getCatalogProviders();
  }

  @Get('catalog')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalog(@Query() dto: QueryServicesDto) {
    return this.servicesService.getCatalogServices(dto);
  }

  @Get('catalog/:id')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalogById(@Param('id') id: string) {
    return this.servicesService.getCatalogServiceById(id);
  }

  // ─── My Services ──────────────────────────────────────────────────────────

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMine(@CurrentUser() user: any, @Query() dto: QueryServicesDto) {
    return this.servicesService.getMyServices(user.id, dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: any, @Body() dto: CreateServiceDto) {
    return this.servicesService.createService(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateServiceDto
  ) {
    return this.servicesService.updateService(id, user.id, dto);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  toggle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.toggleStatus(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.deleteService(id, user.id);
  }

  // ─── Tracking & Metrics ───────────────────────────────────────────────────

  @Post('track')
  @HttpCode(204)
  @UseGuards(OptionalJwtAuthGuard)
  track(
    @Body('serviceId') serviceId: string,
    @Body('type') type: ServiceEventType,
    @Body('sessionId') sessionId: string | undefined,
    @CurrentUser() user: any
  ) {
    // fire-and-forget: no esperamos, 204 inmediato
    this.servicesService
      .trackEvent(serviceId, type, user?.id, sessionId)
      .catch(() => {});
  }

  @Get(':id/metrics')
  @UseGuards(JwtAuthGuard)
  getMetrics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.getServiceMetrics(id, user.id);
  }

  // ─── Service Requests ─────────────────────────────────────────────────────

  @Post('requests/upload-media')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 8, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'service-requests');
          if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const ext = extensionForMimetype(file.mimetype) || extname(file.originalname);
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MEDIA_MIMETYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Tipo de archivo no permitido'), false);
          return;
        }
        cb(null, true);
      },
    })
  )
  uploadRequestMedia(@UploadedFiles() files: Express.Multer.File[]) {
    return { urls: files.map((f) => `/uploads/service-requests/${f.filename}`) };
  }

  @Post('requests')
  @UseGuards(OptionalJwtAuthGuard)
  createRequest(
    @Body() dto: CreateServiceRequestDto,
    @CurrentUser() user: any
  ) {
    return this.servicesService.createServiceRequest(dto, user?.id);
  }

  @Get('requests/mine')
  @UseGuards(JwtAuthGuard)
  getMyRequests(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('as') asRole?: 'provider' | 'client'
  ) {
    return this.servicesService.getMyServiceRequests(
      user.id,
      parseInt(page ?? '1'),
      parseInt(limit ?? '20'),
      asRole ?? 'provider'
    );
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard)
  getRequest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.getServiceRequest(id, user.id);
  }

  @Patch('requests/:id')
  @UseGuards(JwtAuthGuard)
  updateRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { status?: string; providerNotes?: string }
  ) {
    return this.servicesService.updateServiceRequest(id, user.id, body);
  }

  @Patch('requests/:id/status')
  @UseGuards(JwtAuthGuard)
  updateRequestStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('status') status: string
  ) {
    return this.servicesService.updateServiceRequestStatus(id, user.id, status);
  }

  @Patch('requests/:id/confirm-completion')
  @UseGuards(JwtAuthGuard)
  confirmCompletion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.confirmServiceRequestCompletion(id, user.id);
  }

  // ─── Categories (admin) ───────────────────────────────────────────────────

  @Get('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getCategories() {
    return this.servicesService.getCategories();
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createCategory(@Body() dto: CreateServiceCategoryDto) {
    return this.servicesService.createCategory(dto);
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateServiceCategoryDto>
  ) {
    return this.servicesService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteCategory(@Param('id') id: string) {
    return this.servicesService.deleteCategory(id);
  }

  // ─── Modalities (public + admin) ───────────────────────────────────────────

  @Get('modalities')
  @UseGuards(OptionalJwtAuthGuard)
  getModalities() {
    return this.servicesService.getModalities();
  }

  @Get('modalities/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getAllModalities() {
    return this.servicesService.getAllModalities();
  }

  @Post('modalities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createModality(@Body() dto: { name: string; value: string; emoji?: string; sortOrder?: number }) {
    return this.servicesService.createModality(dto);
  }

  @Put('modalities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateModality(
    @Param('id') id: string,
    @Body() dto: Partial<{ name: string; value: string; emoji: string; sortOrder: number; isActive: boolean }>
  ) {
    return this.servicesService.updateModality(id, dto);
  }

  @Delete('modalities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteModality(@Param('id') id: string) {
    return this.servicesService.deleteModality(id);
  }
}
