import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryPostsDto } from './dto/query-profile.dto';

const SOCIAL_ROLES: Role[] = [
  Role.COMMERCE,
  Role.FREELANCER,
  Role.SUPERADMIN,
  Role.ADMIN,
];

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

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

    if (!user || !SOCIAL_ROLES.includes(user.role)) {
      throw new NotFoundException('Perfil no encontrado');
    }

    // Rating aggregado
    const ratingAgg = await this.prisma.review.aggregate({
      where: { targetId: user.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // ¿El usuario actual sigue a este perfil?
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      coverImage: user.coverImage,
      role: user.role,
      restaurant: user.commerce,
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
      isFollowing,
    };
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
    if (!user || !SOCIAL_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Solo COMMERCE y FREELANCER pueden publicar'
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
    if (!target || !SOCIAL_ROLES.includes(target.role)) {
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

    const [reviews, total, agg] = await Promise.all([
      this.prisma.review.findMany({
        where: { targetId: user.id },
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
      this.prisma.review.count({ where: { targetId: user.id } }),
      this.prisma.review.aggregate({
        where: { targetId: user.id },
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
    if (!target || !SOCIAL_ROLES.includes(target.role)) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const existing = await this.prisma.review.findUnique({
      where: { authorId_targetId: { authorId, targetId: dto.targetId } },
    });

    if (existing) {
      // Actualizar reseña existente
      return this.prisma.review.update({
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
    }

    return this.prisma.review.create({
      data: {
        authorId,
        targetId: dto.targetId,
        rating: dto.rating,
        comment: dto.comment,
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
  }

  async deleteReview(authorId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.authorId !== authorId)
      throw new ForbiddenException('No puedes eliminar esta reseña');
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { message: 'Reseña eliminada' };
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
    }
  ) {
    if (dto.quickAccessIds && dto.quickAccessIds.length > 6) {
      throw new BadRequestException('Máximo 6 accesos rápidos');
    }
    return this.prisma.profileSettings.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
      select: { showCatalog: true, showServices: true, quickAccessIds: true },
    });
  }

  async updateCoverImage(userId: string, coverUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { coverImage: coverUrl },
      select: { id: true, coverImage: true },
    });
    return user;
  }

  private async findSocialUser(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !SOCIAL_ROLES.includes(user.role)) {
      throw new NotFoundException('Perfil no encontrado');
    }
    return user;
  }
}
