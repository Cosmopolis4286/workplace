import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { extensionForMimetype } from '../../../common/utils/upload-extension.util';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { EmailVerifiedGuard } from '../../../common/guards/email-verified.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RateLimitGuard, RateLimit } from '../../../common/guards/rate-limit.guard';
import { WalletDepositRequestsService } from './wallet-deposit-requests.service';
import { CreateDepositRequestDto } from './dto/create-deposit-request.dto';
import { ReviewDepositRequestDto } from './dto/review-deposit-request.dto';

// Fuera de "uploads/" (público) por la misma razón que KYC — el comprobante
// puede tener datos bancarios/personales, solo se sirve autenticado.
const DEPOSIT_PROOF_DIR = join(process.cwd(), 'private-uploads', 'wallet-deposit-proofs');

const proofStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(DEPOSIT_PROOF_DIR)) mkdirSync(DEPOSIT_PROOF_DIR, { recursive: true });
    cb(null, DEPOSIT_PROOF_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extensionForMimetype(file.mimetype));
  },
});

const proofFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
    return cb(new BadRequestException('Solo se permiten imágenes (jpeg, png, webp)'), false);
  }
  cb(null, true);
};

@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller('wallet-deposit-requests')
export class WalletDepositRequestsController {
  constructor(private readonly service: WalletDepositRequestsService) {}

  @Get('mine')
  getMine(@CurrentUser() user: any) {
    return this.service.getMine(user.id);
  }

  @Post()
  @UseGuards(EmailVerifiedGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 10, keyGenerator: (req) => `deposit-req:create:${(req as any).user?.id}` })
  @UseInterceptors(
    FileInterceptor('proofImage', { storage: proofStorage, fileFilter: proofFileFilter, limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateDepositRequestDto,
    @UploadedFile() proofImage: Express.Multer.File,
  ) {
    if (!proofImage) throw new BadRequestException('Falta la imagen del comprobante');
    return this.service.create(user.id, dto, `private-wallet-deposit-proofs/${proofImage.filename}`);
  }

  // Comprobante — dueño o admin, autenticado (misma razón que KYC).
  @Get(':id/proof-image')
  async getProofImage(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const filename = await this.service.resolveImageFilename(id, user.id, user.role);
    return res.sendFile(filename, { root: DEPOSIT_PROOF_DIR });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get('admin/pending')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.findAllPending(parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch('admin/:id/review')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req) => `deposit-req:review:${(req as any).user?.id}` })
  review(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: ReviewDepositRequestDto) {
    return this.service.review(id, user.id, dto);
  }
}
