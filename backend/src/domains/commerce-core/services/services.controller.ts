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
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Role, ServiceEventType } from '@prisma/client';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ImportServiceImageDto } from './dto/import-service-image.dto';
import { QueryServicesDto } from './dto/query-services.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { CreatePriceChangeProposalDto } from './dto/create-price-change-proposal.dto';
import { RejectPriceChangeProposalDto } from './dto/reject-price-change-proposal.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { KycApprovedGuard } from '../../../common/guards/kyc-approved.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { CategoryScopeGuard } from '../../../common/guards/category-scope.guard';
import { RequireCategoryScope } from '../../../common/decorators/require-category-scope.decorator';
import { extensionForMimetype } from '../../../common/utils/upload-extension.util';

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

  // forCreation=true: usado por el selector del formulario "Nuevo Servicio",
  // no por la búsqueda pública — ver ServicesService.getCatalogCategories()
  // para la diferencia entre ambos modos.
  @Get('catalog/categories')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalogCategories(
    @CurrentUser() user?: { id: string; role: Role },
    @Query('forCreation') forCreation?: string
  ) {
    return this.servicesService.getCatalogCategories(user, forCreation === 'true');
  }

  @Get('catalog/tags')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalogTags(@Query('q') q?: string) {
    return this.servicesService.getPopularTags(q);
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

  // Reservado para deep-linking directo a un servicio (ej. compartir un link
  // fuera de la app). search.vue hoy reutiliza los datos ya cargados de la
  // lista del catálogo y no llama este endpoint — no está roto, no tiene
  // consumidor todavía.
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

  @Get('mine/stats')
  @UseGuards(JwtAuthGuard)
  getMineStats(@CurrentUser() user: any) {
    return this.servicesService.getMyServicesStats(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard, CategoryScopeGuard)
  @RequirePermission('services:create')
  @RequireCategoryScope({ model: 'serviceCategory', bodyField: 'categoryId' })
  create(@CurrentUser() user: any, @Body() dto: CreateServiceDto) {
    return this.servicesService.createService(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CategoryScopeGuard)
  @RequirePermission('services:edit')
  @RequireCategoryScope({ model: 'serviceCategory', bodyField: 'categoryId' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateServiceDto
  ) {
    return this.servicesService.updateService(id, user.id, dto);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('services:edit')
  toggle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.toggleStatus(id, user.id);
  }

  // slot: 0 = principal, 1-2 = secundarias. Un archivo a la vez porque cada
  // slot se sube/reemplaza de forma independiente desde el formulario.
  @Post(':id/images')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('services:edit')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'services');
          if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes (jpeg, png, webp, gif)'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    })
  )
  uploadServiceImage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('slot') slot: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const slotIndex = Number(slot);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) {
      throw new BadRequestException('slot inválido');
    }
    return this.servicesService.setServiceImageFromUpload(id, user.id, slotIndex, file);
  }

  // Alternativa a subir un archivo: el backend descarga la URL de forma
  // segura (bloquea IPs privadas, valida contenido real) y la guarda como
  // archivo propio — así el resultado nunca depende del hotlinking del sitio
  // de origen ni expone el navegador del usuario a una URL arbitraria.
  @Post(':id/images/from-url')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('services:edit')
  importServiceImageFromUrl(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ImportServiceImageDto
  ) {
    return this.servicesService.importServiceImageFromUrl(id, user.id, dto.slot, dto.url);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('services:delete')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.deleteService(id, user.id);
  }

  // ─── Moderación (admin) ───────────────────────────────────────────────────
  // toggle/remove arriba exigen ser el dueño (assertOwner) — un admin
  // necesita poder ocultar un servicio ajeno reportado sin pasar por eso.

  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  moderate(@Param('id') id: string, @Body() dto: { hide: boolean }) {
    return this.servicesService.moderateService(id, dto.hide);
  }

  // ─── Tracking & Metrics ───────────────────────────────────────────────────

  @Get('opportunities')
  @UseGuards(OptionalJwtAuthGuard)
  getOpportunities(@Query('city') city?: string) {
    return this.servicesService.getOpportunities(city);
  }

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
  @UseGuards(JwtAuthGuard)
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

  // Media de una solicitud (fotos/videos del ítem): solo visible para el cliente,
  // el proveedor de esa solicitud, o un admin/superadmin.
  @Get('requests/media/:filename')
  @UseGuards(JwtAuthGuard)
  async getRequestMedia(
    @Param('filename') filename: string,
    @CurrentUser() user: any,
    @Res() res: Response
  ) {
    const safeFilename = basename(filename);
    if (safeFilename !== filename) throw new NotFoundException('Archivo no encontrado');

    await this.servicesService.authorizeRequestMedia(safeFilename, user.id, user.role);

    const filePath = join(process.cwd(), 'uploads', 'service-requests', safeFilename);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');

    res.sendFile(filePath);
  }

  @Post('requests')
  @UseGuards(JwtAuthGuard, KycApprovedGuard)
  createRequest(
    @Body() dto: CreateServiceRequestDto,
    @CurrentUser() user: any
  ) {
    return this.servicesService.createServiceRequest(dto, user.id);
  }

  @Get('requests/stats')
  @UseGuards(JwtAuthGuard)
  getMyRequestsStats(@CurrentUser() user: any) {
    return this.servicesService.getMyServiceRequestsStats(user.id);
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

  // Debe declararse antes de 'requests/:id' — de lo contrario Nest matchearía
  // 'requests/admin' como 'requests/:id' con id="admin".
  @Get('requests/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getRequestsAdmin(
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
    @Query('requesterId') requesterId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.servicesService.getServiceRequestsAdmin(
      { status, providerId, requesterId, from, to },
      parseInt(page ?? '1'),
      parseInt(limit ?? '20')
    );
  }

  @Get('requests/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getRequestAdminDetail(@Param('id') id: string) {
    return this.servicesService.getServiceRequestAdminDetail(id);
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
    @Body() body: UpdateServiceRequestDto
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

  @Patch('requests/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelRequest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.cancelServiceRequest(id, user.id);
  }

  @Patch('requests/:id/dispute')
  @UseGuards(JwtAuthGuard)
  disputeRequest(@Param('id') id: string, @CurrentUser() user: any, @Body('reason') reason: string) {
    return this.servicesService.disputeServiceRequest(id, user.id, reason);
  }

  // ─── Price change proposals ───────────────────────────────────────────────

  @Post('requests/:id/price-change-proposals')
  @UseGuards(JwtAuthGuard)
  proposePriceChange(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePriceChangeProposalDto
  ) {
    return this.servicesService.proposePriceChange(id, user.id, dto);
  }

  @Get('requests/:id/price-change-proposals')
  @UseGuards(JwtAuthGuard)
  listPriceChangeProposals(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.listPriceChangeProposals(id, user.id);
  }

  @Post('requests/:id/price-change-proposals/:proposalId/approve')
  @UseGuards(JwtAuthGuard)
  approvePriceChangeProposal(@Param('proposalId') proposalId: string, @CurrentUser() user: any) {
    return this.servicesService.approvePriceChangeProposal(proposalId, user.id);
  }

  @Post('requests/:id/price-change-proposals/:proposalId/reject')
  @UseGuards(JwtAuthGuard)
  rejectPriceChangeProposal(
    @Param('proposalId') proposalId: string,
    @CurrentUser() user: any,
    @Body() dto: RejectPriceChangeProposalDto
  ) {
    return this.servicesService.rejectPriceChangeProposal(proposalId, user.id, dto.reason);
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
