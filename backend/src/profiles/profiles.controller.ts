import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { extensionForMimetype } from '../common/utils/upload-extension.util';
import { ProfilesService } from './profiles.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryPostsDto } from './dto/query-profile.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // ─── Public profile ───────────────────────────────────────────────────────

  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  getProfile(@Param('username') username: string, @CurrentUser() user: any) {
    return this.profilesService.getPublicProfile(username, user?.id);
  }

  // ─── Profile settings ─────────────────────────────────────────────────────

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  updateSettings(
    @CurrentUser() user: any,
    @Body()
    dto: {
      showCatalog?: boolean;
      showServices?: boolean;
      quickAccessIds?: string[];
      dashboardQuickActionIds?: string[];
    }
  ) {
    return this.profilesService.updateProfileSettings(user.id, dto);
  }

  // ─── Cover image ──────────────────────────────────────────────────────────

  @Patch('cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'covers');
          if (!existsSync(uploadPath))
            mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extensionForMimetype(file.mimetype));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (
          !file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/) ||
          !extensionForMimetype(file.mimetype)
        ) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes (jpeg, png, webp, gif)'
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    })
  )
  async uploadCover(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.profilesService.updateCoverImage(
      user.id,
      `/uploads/covers/${file.filename}`
    );
  }

  // ─── Posts ────────────────────────────────────────────────────────────────

  @Get(':username/posts')
  @UseGuards(OptionalJwtAuthGuard)
  getPosts(
    @Param('username') username: string,
    @Query() dto: QueryPostsDto,
    @CurrentUser() user: any
  ) {
    return this.profilesService.getPosts(username, dto, user?.id);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.profilesService.createPost(user.id, dto);
  }

  @Post('posts/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'posts');
          if (!existsSync(uploadPath))
            mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extensionForMimetype(file.mimetype));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (
          !file.mimetype.match(
            /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/
          ) ||
          !extensionForMimetype(file.mimetype)
        ) {
          return cb(
            new BadRequestException(
              'Solo se permiten imágenes (jpeg,png,webp,gif) y videos (mp4,webm,mov)'
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    })
  )
  uploadPostMedia(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0)
      throw new BadRequestException('No se recibieron archivos');
    return {
      files: files.map((f) => ({
        url: `/uploads/posts/${f.filename}`,
        type: f.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE',
        originalName: f.originalname,
        size: f.size,
      })),
    };
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  updatePost(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('caption') caption: string
  ) {
    return this.profilesService.updatePost(id, user.id, caption ?? '');
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  deletePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profilesService.deletePost(id, user.id);
  }

  // ─── Likes ────────────────────────────────────────────────────────────────

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  likePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profilesService.likePost(id, user.id);
  }

  @Delete('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  unlikePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profilesService.unlikePost(id, user.id);
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  @Get('posts/:id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  getComments(@Param('id') id: string) {
    return this.profilesService.getComments(id);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCommentDto
  ) {
    return this.profilesService.createComment(id, user.id, dto);
  }

  @Patch('posts/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
    @Body('content') content: string
  ) {
    return this.profilesService.updateComment(commentId, user.id, content);
  }

  @Delete('posts/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any
  ) {
    return this.profilesService.deleteComment(commentId, user.id);
  }

  // ─── Follow / Unfollow ────────────────────────────────────────────────────

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  async follow(@Param('username') username: string, @CurrentUser() user: any) {
    const target = await this.profilesService.getPublicProfile(username);
    return this.profilesService.followUser(user.id, target.id);
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  async unfollow(
    @Param('username') username: string,
    @CurrentUser() user: any
  ) {
    const target = await this.profilesService.getPublicProfile(username);
    return this.profilesService.unfollowUser(user.id, target.id);
  }

  @Get(':username/followers')
  getFollowers(@Param('username') username: string) {
    return this.profilesService.getFollowers(username);
  }

  @Get(':username/following')
  getFollowing(@Param('username') username: string) {
    return this.profilesService.getFollowing(username);
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  @Get(':username/reviews')
  getReviews(
    @Param('username') username: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.profilesService.getReviews(username, page, limit);
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  createReview(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.profilesService.createReview(user.id, dto);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  deleteReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profilesService.deleteReview(user.id, id);
  }

  // ─── Reviews — respuesta del negocio/freelancer ────────────────────────────

  @Patch('reviews/:id/response')
  @UseGuards(JwtAuthGuard)
  respondToReview(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RespondReviewDto
  ) {
    return this.profilesService.respondToReview(user.id, id, dto);
  }

  @Delete('reviews/:id/response')
  @UseGuards(JwtAuthGuard)
  deleteReviewResponse(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profilesService.deleteReviewResponse(user.id, id);
  }

  // ─── Reviews — reportar abuso ───────────────────────────────────────────────

  @Post('reviews/:id/report')
  @UseGuards(JwtAuthGuard)
  reportReview(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReportReviewDto
  ) {
    return this.profilesService.reportReview(user.id, id, dto);
  }

  // ─── Reviews — moderación (permiso reviews:moderate) ───────────────────────

  @Get('admin/reviews/reported')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reviews:moderate')
  listReportedReviews() {
    return this.profilesService.listReportedReviews();
  }

  @Patch('admin/reviews/:id/moderate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reviews:moderate')
  moderateReview(
    @Param('id') id: string,
    @Body('action') action: 'HIDE' | 'RESTORE' | 'DISMISS_REPORTS'
  ) {
    return this.profilesService.moderateReview(id, action);
  }
}
