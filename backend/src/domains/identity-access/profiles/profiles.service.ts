import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { RedisService } from '../../../redis/redis.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { Role } from '@prisma/client';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryPostsDto } from './dto/query-profile.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { ReportReviewDto } from './dto/report-review.dto';

const ADMIN_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];

const AVG_RESPONSE_CACHE_TTL = 60 * 60; // 1h: cambia poco, no necesita estar siempre fresco
const avgResponseCacheKey = (providerId: string) => `profile:avg-response:${providerId}`;

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private redis: RedisService,
    private accountTypeResolver: AccountTypeResolver,
  ) {}

  // ADMIN/SUPERADMIN tienen perfil social por su nivel de acceso puro (Role).
  // COMMERCE/FREELANCER ya no se leen desde Role directo — Role es hoy un
  // espejo derivado de UserProfile (ver RoleResolverService), así que la
  // fuente de verdad real es AccountTypeResolver, que consulta UserProfile
  // ACTIVE primero y solo cae a Role como fallback legacy.
  private async hasSocialProfile(user: { id: string; role: Role }): Promise<boolean> {
    if (ADMIN_ROLES.includes(user.role)) return true;
    const accountType = await this.accountTypeResolver.resolve(user.id);
    return accountType !== null;
  }

  // ─── Public profile ───────────────────────────────────────────────────────

  async getPublicProfile(username: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        coverImage: true,
        role: true,
        commerce: { select: { id: true, name: true, type: true } },
        profileSettings: { select: { showCatalog: true, showServices: true } },
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });

    if (!user || !(await this.hasSocialProfile(user))) {
      throw new NotFoundException('Perfil no encontrado');
    }

    // Rating aggregado
    const ratingAgg = await this.prisma.review.aggregate({
      where: { targetId: user.id, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const avgResponseHours = await this.getAvgResponseHours(user.id);

    // ¿El usuario actual sigue a este perfil?
    let isFollowing = false;
    // ¿El usuario actual puede reseñar a este perfil? (compra/servicio verificado)
    let canReview = false;
    let hasReviewed = false;
    if (currentUserId && currentUserId !== user.id) {
      const [follow, existingReview, verification] = await Promise.all([
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: user.id,
            },
          },
        }),
        this.prisma.review.findUnique({
          where: { authorId_targetId: { authorId: currentUserId, targetId: user.id } },
        }),
        this.findVerifiedTransaction(currentUserId, user.id),
      ]);
      isFollowing = !!follow;
      hasReviewed = !!existingReview;
      canReview = !!verification || hasReviewed;
    }

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      coverImage: user.coverImage,
      role: user.role,
      commerce: user.commerce,
      profileSettings: user.profileSettings ?? {
        showCatalog: true,
        showServices: true,
      },
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: user._count.posts,
      rating: ratingAgg._avg.rating
        ? Number(ratingAgg._avg.rating.toFixed(2))
        : null,
      reviewsCount: ratingAgg._count.rating,
      avgResponseHours,
      isFollowing,
      canReview,
      hasReviewed,
    };
  }

  // Promedio de tiempo entre la creación de una solicitud de servicio y la
  // primera reacción real del proveedor (SEEN/CONTACTED/CLOSED). Se excluyen
  // PENDING (sin respuesta) y CANCELLED (no hubo respuesta real del proveedor).
  // Limitado a las últimas 50 para no escanear todo el histórico en cada visita.
  private async getAvgResponseHours(providerId: string): Promise<number | null> {
    const cached = await this.redis.get(avgResponseCacheKey(providerId));
    if (cached !== null) return cached === 'null' ? null : Number(cached);

    const responded = await this.prisma.serviceRequest.findMany({
      where: {
        providerId,
        status: { in: ['SEEN', 'CONTACTED', 'CLOSED'] },
        statusUpdatedAt: { not: null },
      },
      select: { createdAt: true, statusUpdatedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let result: number | null = null;
    if (responded.length > 0) {
      const totalHours = responded.reduce((sum, r) => {
        const diffMs = r.statusUpdatedAt!.getTime() - r.createdAt.getTime();
        return sum + diffMs / (1000 * 60 * 60);
      }, 0);
      result = Number((totalHours / responded.length).toFixed(1));
    }

    await this.redis.setex(avgResponseCacheKey(providerId), AVG_RESPONSE_CACHE_TTL, String(result));
    return result;
  }

  // ─── Posts ────────────────────────────────────────────────────────────────

  async getPosts(username: string, dto: QueryPostsDto, currentUserId?: string) {
    const user = await this.findSocialUser(username);
    const { page = 1, limit = 12 } = dto;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          media: { orderBy: { order: 'asc' } },
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.post.count({ where: { userId: user.id } }),
    ]);

    // Attach isLiked per post for the current user
    let likedPostIds = new Set<string>();
    if (currentUserId) {
      const likes = await this.prisma.postLike.findMany({
        where: {
          userId: currentUserId,
          postId: { in: posts.map((p) => p.id) },
        },
        select: { postId: true },
      });
      likedPostIds = new Set(likes.map((l) => l.postId));
    }

    const data = posts.map((p) => ({
      ...p,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      isLiked: likedPostIds.has(p.id),
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await this.hasSocialProfile(user))) {
      throw new ForbiddenException(
        'Solo comercios y profesionales pueden publicar'
      );
    }
    if (!dto.media || dto.media.length === 0) {
      throw new BadRequestException(
        'Debes incluir al menos un archivo multimedia'
      );
    }
    if (dto.media.length > 10) {
      throw new BadRequestException('Máximo 10 archivos por publicación');
    }

    const post = await this.prisma.post.create({
      data: {
        caption: dto.caption,
        userId,
        media: {
          create: dto.media.map((m, i) => ({
            url: m.url,
            type: m.type ?? 'IMAGE',
            order: i,
          })),
        },
      },
      include: { media: { orderBy: { order: 'asc' } } },
    });

    return post;
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    if (post.userId !== userId)
      throw new ForbiddenException('No puedes eliminar esta publicación');
    await this.prisma.post.delete({ where: { id: postId } });
    return { message: 'Publicación eliminada' };
  }

  async updatePost(postId: string, userId: string, caption: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    if (post.userId !== userId)
      throw new ForbiddenException('No puedes editar esta publicación');
    return this.prisma.post.update({
      where: { id: postId },
      data: { caption },
      include: { media: { orderBy: { order: 'asc' } } },
    });
  }

  // ─── Follow / Unfollow ────────────────────────────────────────────────────

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId)
      throw new BadRequestException('No puedes seguirte a ti mismo');

    const target = await this.prisma.user.findUnique({
      where: { id: followingId },
    });
    if (!target || !(await this.hasSocialProfile(target))) {
      throw new NotFoundException('Usuario no encontrado');
    }

    try {
      await this.prisma.follow.create({ data: { followerId, followingId } });
    } catch {
      throw new ConflictException('Ya sigues a este usuario');
    }

    return { following: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!follow) throw new NotFoundException('No sigues a este usuario');
    await this.prisma.follow.delete({ where: { id: follow.id } });
    return { following: false };
  }

  async getFollowers(username: string) {
    const user = await this.findSocialUser(username);
    const followers = await this.prisma.follow.findMany({
      where: { followingId: user.id },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: followers.map((f) => f.follower) };
  }

  async getFollowing(username: string) {
    const user = await this.findSocialUser(username);
    const following = await this.prisma.follow.findMany({
      where: { followerId: user.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: following.map((f) => f.following) };
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  async getReviews(username: string, page = 1, limit = 10) {
    const user = await this.findSocialUser(username);
    const skip = (page - 1) * limit;
    const where = { targetId: user.id, isHidden: false };

    const [reviews, total, agg] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating: agg._avg.rating
        ? Number(agg._avg.rating.toFixed(2))
        : null,
      reviewsCount: agg._count.rating,
    };
  }

  async createReview(authorId: string, dto: CreateReviewDto) {
    if (authorId === dto.targetId) {
      throw new BadRequestException('No puedes reseñarte a ti mismo');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetId },
    });
    if (!target || !(await this.hasSocialProfile(target))) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const verification = await this.findVerifiedTransaction(
      authorId,
      dto.targetId,
    );
    if (!verification) {
      throw new ForbiddenException(
        'Solo puedes reseñar a usuarios con los que hayas completado una compra o servicio',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: { authorId_targetId: { authorId, targetId: dto.targetId } },
    });

    if (existing) {
      // Actualizar reseña existente
      const updated = await this.prisma.review.update({
        where: { id: existing.id },
        data: { rating: dto.rating, comment: dto.comment ?? null },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
      await this.recalculateCommerceRating(dto.targetId);
      return updated;
    }

    const review = await this.prisma.review.create({
      data: {
        authorId,
        targetId: dto.targetId,
        rating: dto.rating,
        comment: dto.comment,
        verifiedOrderId: verification.orderId,
        verifiedRequestId: verification.requestId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    await this.recalculateCommerceRating(dto.targetId);

    this.notifications
      .notifyNewReview(
        dto.targetId,
        `${review.author.firstName} ${review.author.lastName}`,
        dto.rating,
        target.username ?? undefined,
      )
      .catch(() => {});

    return review;
  }

  // Recalcula y persiste el rating cacheado del comercio (Commerce.avgRating/
  // reviewsCount) cuyo dueño es `userId`, a partir de sus reviews visibles.
  // No-op si el usuario reseñado no es dueño de ningún comercio (freelancers).
  // Ver catalog.service.ts: getProductsSortedByRating ordena por esta columna
  // en vez de traer todo el catálogo a memoria para ordenar.
  private async recalculateCommerceRating(userId: string): Promise<void> {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!commerce) return;

    const agg = await this.prisma.review.aggregate({
      where: { targetId: userId, isHidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.commerce.update({
      where: { id: commerce.id },
      data: {
        avgRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
        reviewsCount: agg._count.rating,
      },
    });
    // findById cachea `commerce` (Commerce) anidado, incluyendo avgRating.
    await this.redis.del(userFindByIdCacheKey(userId));
  }

  // Busca una transacción real completada entre author → target: una
  // ServiceRequest cerrada al proveedor, o un CatalogOrder cerrado al
  // comercio (resuelto via Commerce.userId).
  private async findVerifiedTransaction(
    authorId: string,
    targetId: string,
  ): Promise<{ orderId?: string; requestId?: string } | null> {
    const request = await this.prisma.serviceRequest.findFirst({
      where: {
        requesterId: authorId,
        providerId: targetId,
        status: 'CLOSED',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (request) return { requestId: request.id };

    const commerce = await this.prisma.commerce.findUnique({
      where: { userId: targetId },
    });
    if (commerce) {
      const order = await this.prisma.catalogOrder.findFirst({
        where: {
          requesterId: authorId,
          commerceId: commerce.id,
          status: 'CLOSED',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (order) return { orderId: order.id };
    }

    return null;
  }

  async deleteReview(authorId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.authorId !== authorId)
      throw new ForbiddenException('No puedes eliminar esta reseña');
    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.recalculateCommerceRating(review.targetId);
    return { message: 'Reseña eliminada' };
  }

  // Solo el usuario reseñado puede responder públicamente a su reseña
  async respondToReview(
    targetUserId: string,
    reviewId: string,
    dto: RespondReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.targetId !== targetUserId)
      throw new ForbiddenException('No puedes responder a esta reseña');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { response: dto.response, respondedAt: new Date() },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        target: { select: { firstName: true, lastName: true, username: true } },
      },
    });

    this.notifications
      .notifyReviewResponse(
        review.authorId,
        `${updated.target.firstName} ${updated.target.lastName}`,
        updated.target.username ?? undefined,
      )
      .catch(() => {});

    return updated;
  }

  async deleteReviewResponse(targetUserId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.targetId !== targetUserId)
      throw new ForbiddenException('No puedes editar esta respuesta');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { response: null, respondedAt: null },
    });
  }

  async reportReview(reporterId: string, reviewId: string, dto: ReportReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.authorId === reporterId)
      throw new BadRequestException('No puedes reportar tu propia reseña');

    // @@unique([reviewId, reporterId]) en el schema respalda esto contra
    // condiciones de carrera, pero se verifica antes también para devolver un
    // 409 claro en vez de un error crudo de constraint — sin esto, un mismo
    // usuario podía reportar la misma reseña N veces y notificar a todos los
    // moderadores en cada intento.
    const existing = await this.prisma.reviewReport.findUnique({
      where: { reviewId_reporterId: { reviewId, reporterId } },
    });
    if (existing) throw new ConflictException('Ya reportaste esta reseña');

    const report = await this.prisma.reviewReport.create({
      data: { reviewId, reporterId, reason: dto.reason },
    });

    this.notifications.notifyReviewReported(dto.reason).catch(() => {});

    return report;
  }

  // ─── Moderación (SUPERADMIN/ADMIN) ────────────────────────────────────────

  async listReportedReviews() {
    return this.prisma.reviewReport.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        review: {
          include: {
            author: {
              select: { id: true, username: true, firstName: true, lastName: true },
            },
            target: {
              select: { id: true, username: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  async moderateReview(
    reviewId: string,
    action: 'HIDE' | 'RESTORE' | 'DISMISS_REPORTS',
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');

    if (action === 'HIDE' || action === 'RESTORE') {
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { isHidden: action === 'HIDE' },
      });
      await this.recalculateCommerceRating(review.targetId);
    }

    await this.prisma.reviewReport.updateMany({
      where: { reviewId, status: 'PENDING' },
      data: { status: action === 'DISMISS_REPORTS' ? 'DISMISSED' : 'REVIEWED' },
    });

    return { message: 'Moderación aplicada' };
  }

  // ─── Likes ────────────────────────────────────────────────────────────────

  async likePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada');

    try {
      await this.prisma.postLike.create({ data: { postId, userId } });
    } catch {
      throw new ConflictException('Ya diste like a esta publicación');
    }

    const count = await this.prisma.postLike.count({ where: { postId } });
    await this.prisma.post.update({
      where: { id: postId },
      data: { likesCount: count },
    });
    return { liked: true, likesCount: count };
  }

  async unlikePost(postId: string, userId: string) {
    const like = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!like)
      throw new NotFoundException('No has dado like a esta publicación');
    await this.prisma.postLike.delete({ where: { id: like.id } });

    const count = await this.prisma.postLike.count({ where: { postId } });
    await this.prisma.post.update({
      where: { id: postId },
      data: { likesCount: count },
    });
    return { liked: false, likesCount: count };
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  async getComments(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada');

    const comments = await this.prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
    return { data: comments };
  }

  async createComment(postId: string, userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Publicación no encontrada');

    const comment = await this.prisma.postComment.create({
      data: { postId, userId, content: dto.content },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    const count = await this.prisma.postComment.count({ where: { postId } });
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: count },
    });
    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (comment.userId !== userId)
      throw new ForbiddenException('No puedes eliminar este comentario');
    await this.prisma.postComment.delete({ where: { id: commentId } });

    const count = await this.prisma.postComment.count({
      where: { postId: comment.postId },
    });
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: count },
    });
    return { message: 'Comentario eliminado' };
  }

  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    if (comment.userId !== userId)
      throw new ForbiddenException('No puedes editar este comentario');
    return this.prisma.postComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  }

  // ─── Upload media (multipart) ─────────────────────────────────────────────

  getMediaUrl(filename: string): string {
    return `/uploads/posts/${filename}`;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // ─── Cover image ──────────────────────────────────────────────────────────

  async updateProfileSettings(
    userId: string,
    dto: {
      showCatalog?: boolean;
      showServices?: boolean;
      quickAccessIds?: string[];
      dashboardQuickActionIds?: string[];
    }
  ) {
    if (dto.quickAccessIds && dto.quickAccessIds.length > 6) {
      throw new BadRequestException('Máximo 6 accesos rápidos');
    }
    if (dto.dashboardQuickActionIds && dto.dashboardQuickActionIds.length > 6) {
      throw new BadRequestException('Máximo 6 acciones rápidas');
    }
    const settings = await this.prisma.profileSettings.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
      select: {
        showCatalog: true,
        showServices: true,
        quickAccessIds: true,
        dashboardQuickActionIds: true,
      },
    });
    await this.redis.del(userFindByIdCacheKey(userId));
    return settings;
  }

  async updateCoverImage(userId: string, coverUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { coverImage: coverUrl },
      select: { id: true, coverImage: true },
    });
    await this.redis.del(userFindByIdCacheKey(userId));
    return user;
  }

  private async findSocialUser(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !(await this.hasSocialProfile(user))) {
      throw new NotFoundException('Perfil no encontrado');
    }
    return user;
  }
}
