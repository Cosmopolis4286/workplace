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
  UploadedFiles,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { ProfilesService } from './profiles.service'
import { CreatePostDto } from './dto/create-post.dto'
import { CreateReviewDto } from './dto/create-review.dto'
import { QueryPostsDto } from './dto/query-profile.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard'

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // ─── Public profile ───────────────────────────────────────────────────────

  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  getProfile(@Param('username') username: string, @CurrentUser() user: any) {
    return this.profilesService.getPublicProfile(username, user?.id)
  }

  // ─── Posts ────────────────────────────────────────────────────────────────

  @Get(':username/posts')
  @UseGuards(OptionalJwtAuthGuard)
  getPosts(
    @Param('username') username: string,
    @Query() dto: QueryPostsDto,
    @CurrentUser() user: any,
  ) {
    return this.profilesService.getPosts(username, dto, user?.id)
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.profilesService.createPost(user.id, dto)
  }

  @Post('posts/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'posts')
          if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true })
          cb(null, uploadPath)
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
          cb(null, unique + extname(file.originalname))
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|mov))$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes (jpeg,png,webp,gif) y videos (mp4,webm,mov)'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  uploadPostMedia(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) throw new BadRequestException('No se recibieron archivos')
    return {
      files: files.map(f => ({
        url: `/uploads/posts/${f.filename}`,
        type: f.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE',
        originalName: f.originalname,
        size: f.size,
      })),
    }
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  updatePost(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('caption') caption: string,
  ) {
    return this.profilesService.updatePost(id, user.id, caption ?? '')
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  deletePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profilesService.deletePost(id, user.id)
  }

  // ─── Follow / Unfollow ────────────────────────────────────────────────────

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  async follow(@Param('username') username: string, @CurrentUser() user: any) {
    const target = await this.profilesService.getPublicProfile(username)
    return this.profilesService.followUser(user.id, target.id)
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  async unfollow(@Param('username') username: string, @CurrentUser() user: any) {
    const target = await this.profilesService.getPublicProfile(username)
    return this.profilesService.unfollowUser(user.id, target.id)
  }

  @Get(':username/followers')
  getFollowers(@Param('username') username: string) {
    return this.profilesService.getFollowers(username)
  }

  @Get(':username/following')
  getFollowing(@Param('username') username: string) {
    return this.profilesService.getFollowing(username)
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  @Get(':username/reviews')
  getReviews(
    @Param('username') username: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.profilesService.getReviews(username, page, limit)
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  createReview(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.profilesService.createReview(user.id, dto)
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  deleteReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profilesService.deleteReview(user.id, id)
  }
}
