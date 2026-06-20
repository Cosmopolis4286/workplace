import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { extensionForMimetype } from '../common/utils/upload-extension.util';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';
import { KycService } from './kyc.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';

const kycImageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads', 'kyc');
    if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + extensionForMimetype(file.mimetype));
  },
});

const kycImageFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
    return cb(new BadRequestException('Solo se permiten imágenes (jpeg, png, webp)'), false);
  }
  cb(null, true);
};

@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('me')
  getMyStatus(@CurrentUser() user: any) {
    return this.kycService.getMyStatus(user.id);
  }

  @Post('me/submit')
  @RateLimit({ windowMs: 60_000 * 60, maxRequests: 5, keyGenerator: (req) => `kyc:submit:${(req as any).user?.id}` })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'frontImage', maxCount: 1 },
        { name: 'backImage', maxCount: 1 },
        { name: 'selfieImage', maxCount: 1 },
      ],
      { storage: kycImageStorage, fileFilter: kycImageFileFilter, limits: { fileSize: 8 * 1024 * 1024 } },
    ),
  )
  submit(
    @CurrentUser() user: any,
    @Body() dto: SubmitVerificationDto,
    @UploadedFiles()
    files: { frontImage?: Express.Multer.File[]; backImage?: Express.Multer.File[]; selfieImage?: Express.Multer.File[] },
  ) {
    const frontImage = files?.frontImage?.[0];
    const selfieImage = files?.selfieImage?.[0];
    if (!frontImage) throw new BadRequestException('Falta la foto frontal del documento');
    if (!selfieImage) throw new BadRequestException('Falta la selfie de verificación');

    return this.kycService.submit(user.id, dto, {
      frontImageUrl: `/uploads/kyc/${frontImage.filename}`,
      backImageUrl: files?.backImage?.[0] ? `/uploads/kyc/${files.backImage[0].filename}` : undefined,
      selfieImageUrl: `/uploads/kyc/${selfieImage.filename}`,
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get('admin/pending')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.kycService.findAllPending(parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('admin/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.kycService.findOne(id);
  }

  @Patch('admin/:id/review')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req) => `kyc:review:${(req as any).user?.id}` })
  review(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: ReviewVerificationDto) {
    return this.kycService.review(id, user.id, dto);
  }
}
