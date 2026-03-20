import { ref } from 'vue'
import { useAuth } from './useAuth'

export interface ProfileMedia {
  id: string
  url: string
  type: 'IMAGE' | 'VIDEO'
  order: number
}

export interface ProfilePost {
  id: string
  caption?: string
  media: ProfileMedia[]
  likesCount: number
  commentsCount: number
  isLiked: boolean
  createdAt: string
  updatedAt: string
  user: { id: string; username?: string; firstName: string; lastName: string; avatar?: string }
}

export interface PostComment {
  id: string
  postId: string
  content: string
  createdAt: string
  updatedAt: string
  user: { id: string; username?: string; firstName: string; lastName: string; avatar?: string }
}

export interface PublicProfile {
  id: string
  username?: string
  firstName: string
  lastName: string
  avatar?: string
  coverImage?: string
  role: string
  restaurant?: { id: string; name: string; type?: string }
  profileSettings: { showCatalog: boolean; showServices: boolean }
  followersCount: number
  followingCount: number
  postsCount: number
  rating: number | null
  reviewsCount: number
  isFollowing: boolean
}

export interface ProfileReview {
  id: string
  rating: number
  comment?: string
  createdAt: string
  author: { id: string; username?: string; firstName: string; lastName: string; avatar?: string }
}

export interface ReviewStats {
  averageRating: number | null
  reviewsCount: number
}

export function useProfiles() {
  const { getHeaders } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  const profile = ref<PublicProfile | null>(null)
  const posts = ref<ProfilePost[]>([])
  const postsMeta = ref({ total: 0, page: 1, totalPages: 1 })
  const reviews = ref<ProfileReview[]>([])
  const reviewStats = ref<ReviewStats>({ averageRating: null, reviewsCount: 0 })
  const loading = ref(false)
  const loadingPosts = ref(false)
  const loadingReviews = ref(false)
  const error = ref<string | null>(null)

  // ─── Profile ────────────────────────────────────────────────────────────

  async function fetchProfile(username: string) {
    loading.value = true
    error.value = null
    try {
      profile.value = await $fetch<PublicProfile>(`${apiUrl}/profiles/${username}`, {
        headers: getHeaders(),
      })
    } catch (e: any) {
      error.value = e?.data?.message ?? 'Perfil no encontrado'
      profile.value = null
    } finally {
      loading.value = false
    }
  }

  // ─── Posts ───────────────────────────────────────────────────────────────

  async function fetchPosts(username: string, page = 1) {
    loadingPosts.value = true
    try {
      const res = await $fetch<{ data: ProfilePost[]; total: number; page: number; totalPages: number }>(
        `${apiUrl}/profiles/${username}/posts?page=${page}&limit=12`,
        { headers: getHeaders() },
      )
      if (page === 1) posts.value = res.data
      else posts.value.push(...res.data)
      postsMeta.value = { total: res.total, page: res.page, totalPages: res.totalPages }
    } finally {
      loadingPosts.value = false
    }
  }

  async function uploadMedia(files: File[]): Promise<{ url: string; type: 'IMAGE' | 'VIDEO' }[]> {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    const res = await $fetch<{ files: { url: string; type: string; originalName?: string; size?: number }[] }>(
      `${apiUrl}/profiles/posts/upload`,
      { method: 'POST', headers: getHeaders(), body: form },
    )
    // Solo pasar url y type al DTO (forbidNonWhitelisted=true en el backend)
    return res.files.map(f => ({ url: f.url, type: f.type as 'IMAGE' | 'VIDEO' }))
  }

  async function uploadCover(file: File): Promise<{ coverImage: string }> {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ id: string; coverImage: string }>(
      `${apiUrl}/profiles/cover`,
      { method: 'PATCH', headers: getHeaders(), body: form },
    )
    if (profile.value) profile.value.coverImage = res.coverImage
    return res
  }

  async function createPost(caption: string, mediaItems: { url: string; type: 'IMAGE' | 'VIDEO' }[]) {
    const post = await $fetch<ProfilePost>(`${apiUrl}/profiles/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: { caption: caption || undefined, media: mediaItems },
    })
    posts.value.unshift(post)
    if (profile.value) profile.value.postsCount++
    return post
  }

  async function deletePost(postId: string) {
    await $fetch(`${apiUrl}/profiles/posts/${postId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    posts.value = posts.value.filter(p => p.id !== postId)
    if (profile.value) profile.value.postsCount--
  }

  async function updatePostCaption(postId: string, caption: string) {
    const updated = await $fetch<ProfilePost>(`${apiUrl}/profiles/posts/${postId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: { caption },
    })
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) posts.value[idx] = updated
  }

  // ─── Follow ──────────────────────────────────────────────────────────────

  async function follow(username: string) {
    await $fetch(`${apiUrl}/profiles/${username}/follow`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (profile.value) {
      profile.value.isFollowing = true
      profile.value.followersCount++
    }
  }

  async function unfollow(username: string) {
    await $fetch(`${apiUrl}/profiles/${username}/follow`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (profile.value) {
      profile.value.isFollowing = false
      profile.value.followersCount--
    }
  }

  // ─── Reviews ─────────────────────────────────────────────────────────────

  async function fetchReviews(username: string, page = 1) {
    loadingReviews.value = true
    try {
      const res = await $fetch<{
        data: ProfileReview[]
        averageRating: number | null
        reviewsCount: number
        total: number
        totalPages: number
      }>(`${apiUrl}/profiles/${username}/reviews?page=${page}`, { headers: getHeaders() })

      if (page === 1) reviews.value = res.data
      else reviews.value.push(...res.data)
      reviewStats.value = { averageRating: res.averageRating, reviewsCount: res.reviewsCount }
    } finally {
      loadingReviews.value = false
    }
  }

  async function submitReview(targetId: string, rating: number, comment: string) {
    const review = await $fetch<ProfileReview>(`${apiUrl}/profiles/reviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: { targetId, rating, comment: comment || undefined },
    })
    // Actualizar localmente sin sobreescribir las reseñas existentes de otros usuarios
    const idx = reviews.value.findIndex(r => r.author.id === review.author.id)
    if (idx !== -1) {
      // Actualizar reseña existente del mismo autor (mantiene las de otros intactas)
      const oldRating = reviews.value[idx].rating
      reviews.value[idx] = review
      // Recalcular promedio localmente
      const total = reviews.value.reduce((sum, r) => sum + r.rating, 0)
      reviewStats.value = {
        reviewsCount: reviewStats.value.reviewsCount,
        averageRating: Number((total / reviews.value.length).toFixed(2)),
      }
    } else {
      // Nueva reseña: agregar al inicio y actualizar conteo
      reviews.value.unshift(review)
      const total = reviews.value.reduce((sum, r) => sum + r.rating, 0)
      reviewStats.value = {
        reviewsCount: reviewStats.value.reviewsCount + 1,
        averageRating: Number((total / reviews.value.length).toFixed(2)),
      }
    }
    return review
  }

  async function deleteReview(reviewId: string) {
    await $fetch(`${apiUrl}/profiles/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    reviews.value = reviews.value.filter(r => r.id !== reviewId)
    const newCount = reviewStats.value.reviewsCount - 1
    const total = reviews.value.reduce((sum, r) => sum + r.rating, 0)
    reviewStats.value = {
      reviewsCount: newCount,
      averageRating: newCount > 0 ? Number((total / reviews.value.length).toFixed(2)) : null,
    }
  }

  // ─── Likes ───────────────────────────────────────────────────────────────

  async function likePost(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const res = await $fetch<{ liked: boolean; likesCount: number }>(
      `${apiUrl}/profiles/posts/${postId}/like`,
      { method: 'POST', headers: getHeaders() },
    )
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], isLiked: true, likesCount: res.likesCount }
    }
    return res
  }

  async function unlikePost(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const res = await $fetch<{ liked: boolean; likesCount: number }>(
      `${apiUrl}/profiles/posts/${postId}/like`,
      { method: 'DELETE', headers: getHeaders() },
    )
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], isLiked: false, likesCount: res.likesCount }
    }
    return res
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  async function fetchComments(postId: string): Promise<PostComment[]> {
    const res = await $fetch<{ data: PostComment[] }>(
      `${apiUrl}/profiles/posts/${postId}/comments`,
      { headers: getHeaders() },
    )
    return res.data
  }

  async function createComment(postId: string, content: string): Promise<PostComment> {
    const comment = await $fetch<PostComment>(
      `${apiUrl}/profiles/posts/${postId}/comments`,
      { method: 'POST', headers: getHeaders(), body: { content } },
    )
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], commentsCount: posts.value[idx].commentsCount + 1 }
    }
    return comment
  }

  async function deleteComment(postId: string, commentId: string): Promise<void> {
    await $fetch(`${apiUrl}/profiles/posts/comments/${commentId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], commentsCount: Math.max(0, posts.value[idx].commentsCount - 1) }
    }
  }

  async function updateComment(commentId: string, content: string): Promise<PostComment> {
    return $fetch<PostComment>(`${apiUrl}/profiles/posts/comments/${commentId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: { content },
    })
  }

  async function updateProfileSettings(dto: { showCatalog?: boolean; showServices?: boolean }) {
    const res = await $fetch<{ showCatalog: boolean; showServices: boolean }>(
      `${apiUrl}/profiles/settings`,
      { method: 'PATCH', headers: getHeaders(), body: dto },
    )
    if (profile.value) {
      profile.value.profileSettings = res
    }
    return res
  }

  return {
    profile,
    posts,
    postsMeta,
    reviews,
    reviewStats,
    loading,
    loadingPosts,
    loadingReviews,
    error,
    fetchProfile,
    fetchPosts,
    uploadMedia,
    uploadCover,
    createPost,
    deletePost,
    updatePostCaption,
    likePost,
    unlikePost,
    fetchComments,
    createComment,
    deleteComment,
    updateComment,
    follow,
    unfollow,
    fetchReviews,
    submitReview,
    deleteReview,
    updateProfileSettings,
  }
}
