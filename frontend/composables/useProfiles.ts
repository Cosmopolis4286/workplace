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
  createdAt: string
  user: { id: string; username?: string; firstName: string; lastName: string; avatar?: string }
}

export interface PublicProfile {
  id: string
  username?: string
  firstName: string
  lastName: string
  avatar?: string
  role: string
  restaurant?: { id: string; name: string; type?: string }
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
      profile.value = await $fetch<PublicProfile>(`${apiUrl}/api/profiles/${username}`, {
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
        `${apiUrl}/api/profiles/${username}/posts?page=${page}&limit=12`,
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
    const res = await $fetch<{ files: { url: string; type: string }[] }>(
      `${apiUrl}/api/profiles/posts/upload`,
      { method: 'POST', headers: getHeaders(), body: form },
    )
    return res.files as { url: string; type: 'IMAGE' | 'VIDEO' }[]
  }

  async function createPost(caption: string, mediaItems: { url: string; type: 'IMAGE' | 'VIDEO' }[]) {
    const post = await $fetch<ProfilePost>(`${apiUrl}/api/profiles/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: { caption: caption || undefined, media: mediaItems },
    })
    posts.value.unshift(post)
    if (profile.value) profile.value.postsCount++
    return post
  }

  async function deletePost(postId: string) {
    await $fetch(`${apiUrl}/api/profiles/posts/${postId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    posts.value = posts.value.filter(p => p.id !== postId)
    if (profile.value) profile.value.postsCount--
  }

  async function updatePostCaption(postId: string, caption: string) {
    const updated = await $fetch<ProfilePost>(`${apiUrl}/api/profiles/posts/${postId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: { caption },
    })
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx !== -1) posts.value[idx] = updated
  }

  // ─── Follow ──────────────────────────────────────────────────────────────

  async function follow(username: string) {
    await $fetch(`${apiUrl}/api/profiles/${username}/follow`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (profile.value) {
      profile.value.isFollowing = true
      profile.value.followersCount++
    }
  }

  async function unfollow(username: string) {
    await $fetch(`${apiUrl}/api/profiles/${username}/follow`, {
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
      }>(`${apiUrl}/api/profiles/${username}/reviews?page=${page}`, { headers: getHeaders() })

      if (page === 1) reviews.value = res.data
      else reviews.value.push(...res.data)
      reviewStats.value = { averageRating: res.averageRating, reviewsCount: res.reviewsCount }
    } finally {
      loadingReviews.value = false
    }
  }

  async function submitReview(targetId: string, rating: number, comment: string) {
    const review = await $fetch<ProfileReview>(`${apiUrl}/api/profiles/reviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: { targetId, rating, comment: comment || undefined },
    })
    // Recargar reviews para obtener media actualizado
    return review
  }

  async function deleteReview(reviewId: string) {
    await $fetch(`${apiUrl}/api/profiles/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    reviews.value = reviews.value.filter(r => r.id !== reviewId)
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
    createPost,
    deletePost,
    updatePostCaption,
    follow,
    unfollow,
    fetchReviews,
    submitReview,
    deleteReview,
  }
}
