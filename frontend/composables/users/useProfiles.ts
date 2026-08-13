import { ref } from 'vue'
import { useApi } from '../core/useApi'

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
  commerce?: { id: string; name: string; type?: string }
  profileSettings: { showCatalog: boolean; showServices: boolean }
  followersCount: number
  followingCount: number
  postsCount: number
  rating: number | null
  reviewsCount: number
  avgResponseHours: number | null
  isFollowing: boolean
  canReview: boolean
  hasReviewed: boolean
}

export interface ProfileReview {
  id: string
  rating: number
  comment?: string
  createdAt: string
  author: { id: string; username?: string; firstName: string; lastName: string; avatar?: string }
  verifiedOrderId?: string | null
  verifiedRequestId?: string | null
  response?: string | null
  respondedAt?: string | null
}

export interface ReviewStats {
  averageRating: number | null
  reviewsCount: number
}

export function useProfiles() {
  const { get, post, put, patch, del } = useApi()

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
      profile.value = await get<PublicProfile>(`/profiles/${username}`)
    } catch (e: any) {
      error.value = e?.message ?? 'Perfil no encontrado'
      profile.value = null
    } finally {
      loading.value = false
    }
  }

  // ─── Posts ───────────────────────────────────────────────────────────────

  async function fetchPosts(username: string, page = 1) {
    loadingPosts.value = true
    try {
      const res = await get<{ data: ProfilePost[]; total: number; page: number; totalPages: number }>(
        `/profiles/${username}/posts?page=${page}&limit=12`,
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
    const res = await post<{ files: { url: string; type: string; originalName?: string; size?: number }[] }>(
      '/profiles/posts/upload', form,
    )
    // Solo pasar url y type al DTO (forbidNonWhitelisted=true en el backend)
    return res.files.map(f => ({ url: f.url, type: f.type as 'IMAGE' | 'VIDEO' }))
  }

  async function uploadCover(file: File): Promise<{ coverImage: string }> {
    const form = new FormData()
    form.append('file', file)
    const res = await patch<{ id: string; coverImage: string }>('/profiles/cover', form)
    if (profile.value) profile.value.coverImage = res.coverImage
    return res
  }

  async function createPost(caption: string, mediaItems: { url: string; type: 'IMAGE' | 'VIDEO' }[]) {
    const created = await post<ProfilePost>('/profiles/posts', { caption: caption || undefined, media: mediaItems })
    posts.value.unshift(created)
    if (profile.value) profile.value.postsCount++
    return created
  }

  async function deletePost(postId: string) {
    await del(`/profiles/posts/${postId}`)
    posts.value = posts.value.filter(p => p.id !== postId)
    if (profile.value) profile.value.postsCount--
  }

  async function updatePostCaption(postId: string, caption: string) {
    const updated = await patch<ProfilePost>(`/profiles/posts/${postId}`, { caption })
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) posts.value[idx] = updated
  }

  // ─── Follow ──────────────────────────────────────────────────────────────

  async function follow(username: string) {
    await post(`/profiles/${username}/follow`, {})
    if (profile.value) {
      profile.value.isFollowing = true
      profile.value.followersCount++
    }
  }

  async function unfollow(username: string) {
    await del(`/profiles/${username}/follow`)
    if (profile.value) {
      profile.value.isFollowing = false
      profile.value.followersCount--
    }
  }

  // ─── Reviews ─────────────────────────────────────────────────────────────

  async function fetchReviews(username: string, page = 1) {
    loadingReviews.value = true
    try {
      const res = await get<{
        data: ProfileReview[]
        averageRating: number | null
        reviewsCount: number
        total: number
        totalPages: number
      }>(`/profiles/${username}/reviews?page=${page}`)

      if (page === 1) reviews.value = res.data
      else reviews.value.push(...res.data)
      reviewStats.value = { averageRating: res.averageRating, reviewsCount: res.reviewsCount }
    } finally {
      loadingReviews.value = false
    }
  }

  async function submitReview(username: string, targetId: string, rating: number, comment: string) {
    const review = await post<ProfileReview>('/profiles/reviews', { targetId, rating, comment: comment || undefined })
    // Re-sincroniza desde el backend: el promedio/conteo exactos solo viven ahí,
    // estimarlos con la página cargada en memoria desincroniza si hay paginación.
    await fetchReviews(username, 1)
    return review
  }

  async function deleteReview(username: string, reviewId: string) {
    await del(`/profiles/reviews/${reviewId}`)
    await fetchReviews(username, 1)
  }

  async function respondToReview(reviewId: string, response: string) {
    const updated = await patch<ProfileReview>(`/profiles/reviews/${reviewId}/response`, { response })
    const idx = reviews.value.findIndex(r => r.id === reviewId)
    if (idx !== -1) reviews.value[idx] = updated
    return updated
  }

  async function deleteReviewResponse(reviewId: string) {
    await del(`/profiles/reviews/${reviewId}/response`)
    const idx = reviews.value.findIndex(r => r.id === reviewId)
    if (idx !== -1) reviews.value[idx] = { ...reviews.value[idx], response: null, respondedAt: null }
  }

  async function reportReview(reviewId: string, reason: string) {
    return post(`/profiles/reviews/${reviewId}/report`, { reason })
  }

  // ─── Likes ───────────────────────────────────────────────────────────────

  async function likePost(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const res = await post<{ liked: boolean; likesCount: number }>(`/profiles/posts/${postId}/like`, {})
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], isLiked: true, likesCount: res.likesCount }
    }
    return res
  }

  async function unlikePost(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const res = await del<{ liked: boolean; likesCount: number }>(`/profiles/posts/${postId}/like`)
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], isLiked: false, likesCount: res.likesCount }
    }
    return res
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  async function fetchComments(postId: string): Promise<PostComment[]> {
    const res = await get<{ data: PostComment[] }>(`/profiles/posts/${postId}/comments`)
    return res.data
  }

  async function createComment(postId: string, content: string): Promise<PostComment> {
    const comment = await post<PostComment>(`/profiles/posts/${postId}/comments`, { content })
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], commentsCount: posts.value[idx].commentsCount + 1 }
    }
    return comment
  }

  async function deleteComment(postId: string, commentId: string): Promise<void> {
    await del(`/profiles/posts/comments/${commentId}`)
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], commentsCount: Math.max(0, posts.value[idx].commentsCount - 1) }
    }
  }

  async function updateComment(commentId: string, content: string): Promise<PostComment> {
    return patch<PostComment>(`/profiles/posts/comments/${commentId}`, { content })
  }

  async function updateProfileSettings(dto: { showCatalog?: boolean; showServices?: boolean }) {
    const res = await patch<{ showCatalog: boolean; showServices: boolean }>('/profiles/settings', dto)
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
    respondToReview,
    deleteReviewResponse,
    reportReview,
    updateProfileSettings,
  }
}
