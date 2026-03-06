<template>
  <NuxtLayout :name="layout">
  <div class="max-w-4xl mx-auto px-4 py-6">

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-6">
      <div class="card-premium p-6 animate-pulse flex gap-6">
        <div class="h-28 w-28 rounded-full bg-gray-200 flex-shrink-0" />
        <div class="flex-1 space-y-3 pt-2">
          <div class="h-6 bg-gray-200 rounded w-40" />
          <div class="h-4 bg-gray-200 rounded w-24" />
          <div class="flex gap-6 mt-4">
            <div v-for="i in 4" :key="i" class="h-10 w-16 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="error || !profile" class="card-premium p-12 text-center">
      <div class="text-5xl mb-4">😕</div>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Perfil no encontrado</h2>
      <p class="text-gray-500 mb-6">Este usuario no existe o no tiene perfil público.</p>
      <NuxtLink to="/" class="inline-flex items-center gap-2 px-5 py-2.5 bg-ifood-red text-white rounded-xl font-semibold">
        Volver al inicio
      </NuxtLink>
    </div>

    <template v-else>
      <!-- ── Header del perfil ─────────────────────────────────────────── -->
      <div class="card-premium p-6 mb-6">
        <div class="flex flex-col sm:flex-row gap-6 items-start">

          <!-- Avatar -->
          <div class="flex-shrink-0 relative">
            <div class="h-28 w-28 rounded-full overflow-hidden ring-4 ring-white shadow-xl">
              <img v-if="profile.avatar" :src="avatarSrc(profile.avatar)" :alt="profile.firstName" class="h-full w-full object-cover">
              <div v-else class="h-full w-full bg-gradient-to-br from-ifood-red to-red-700 flex items-center justify-center">
                <span class="text-3xl font-bold text-white">{{ initials }}</span>
              </div>
            </div>
            <!-- Cambiar foto — solo perfil propio -->
            <button
              v-if="isOwnProfile"
              type="button"
              :disabled="uploadingAvatar"
              class="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60"
              title="Cambiar foto"
              @click="avatarFileInput?.click()"
            >
              <span v-if="uploadingAvatar" class="h-4 w-4 border-2 border-ifood-red border-t-transparent rounded-full animate-spin" />
              <CameraIcon v-else class="h-4 w-4 text-gray-600" />
            </button>
            <input
              ref="avatarFileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="hidden"
              @change="onAvatarFileSelected"
            >
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-start gap-3 mb-1">
              <h1 class="text-2xl font-bold text-gray-900">{{ profile.firstName }} {{ profile.lastName }}</h1>
              <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="roleBadge">{{ roleLabel }}</span>
            </div>

            <p v-if="profile.username" class="text-gray-400 text-sm mb-1">@{{ profile.username }}</p>
            <p v-if="profile.restaurant" class="text-gray-500 text-sm mb-3">
              🏪 {{ profile.restaurant.name }}<span v-if="profile.restaurant.type"> · {{ profile.restaurant.type }}</span>
            </p>

            <!-- Stats row -->
            <div class="flex flex-wrap gap-6 text-center">
              <button class="hover:text-ifood-red transition-colors" @click="activeTab = 'posts'">
                <div class="text-xl font-bold text-gray-900">{{ profile.postsCount }}</div>
                <div class="text-xs text-gray-500">publicaciones</div>
              </button>
              <button class="hover:text-ifood-red transition-colors" @click="showFollowersModal = true">
                <div class="text-xl font-bold text-gray-900">{{ profile.followersCount }}</div>
                <div class="text-xs text-gray-500">seguidores</div>
              </button>
              <button class="hover:text-ifood-red transition-colors" @click="showFollowingModal = true">
                <div class="text-xl font-bold text-gray-900">{{ profile.followingCount }}</div>
                <div class="text-xs text-gray-500">siguiendo</div>
              </button>
              <button class="hover:text-ifood-red transition-colors" @click="activeTab = 'reviews'">
                <div class="flex items-center gap-1 justify-center">
                  <span class="text-xl font-bold text-gray-900">{{ profile.rating ?? '—' }}</span>
                  <StarIcon class="h-4 w-4 text-amber-400" />
                </div>
                <div class="text-xs text-gray-500">{{ profile.reviewsCount }} reseñas</div>
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="isAuthenticated && currentUser?.id !== profile.id" class="flex gap-2 flex-shrink-0">
            <button
              v-if="!profile.isFollowing"
              class="px-5 py-2 bg-ifood-red text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all"
              :disabled="followLoading"
              @click="handleFollow"
            >
              <span v-if="followLoading" class="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span v-else>Seguir</span>
            </button>
            <button
              v-else
              class="px-5 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-red-300 hover:text-ifood-red transition-all"
              :disabled="followLoading"
              @click="handleUnfollow"
            >
              Siguiendo
            </button>
            <button
              class="px-4 py-2 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              @click="activeTab = 'reviews'; showReviewForm = true"
            >
              ★ Reseñar
            </button>
          </div>

          <!-- Own profile badge -->
          <div v-else-if="isAuthenticated && currentUser?.id === profile.id" class="flex-shrink-0">
            <span class="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Tu perfil</span>
          </div>
        </div>
      </div>

      <!-- ── Tabs ─────────────────────────────────────────────────────── -->
      <div class="flex border-b border-gray-200 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-6 py-3 text-sm font-semibold border-b-2 transition-colors"
          :class="activeTab === tab.key
            ? 'border-ifood-red text-ifood-red'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- ── TAB: Publicaciones ──────────────────────────────────────── -->
      <div v-if="activeTab === 'posts'">

        <!-- Own post creation button -->
        <div v-if="isOwnProfile && canPost" class="mb-6">
          <button
            class="w-full flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-ifood-red hover:text-ifood-red transition-all"
            @click="showPostModal = true"
          >
            <PlusCircleIcon class="h-6 w-6" />
            <span class="font-medium">Nueva publicación</span>
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="posts.length === 0 && !loadingPosts" class="text-center py-16 text-gray-400">
          <div class="text-5xl mb-3">📷</div>
          <p class="font-medium">Sin publicaciones aún</p>
        </div>

        <!-- Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          <div
            v-for="post in posts"
            :key="post.id"
            class="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100"
            @click="openPost(post)"
          >
            <!-- Thumbnail -->
            <img
              v-if="post.media[0]?.type === 'IMAGE'"
              :src="mediaSrc(post.media[0].url)"
              :alt="post.caption ?? ''"
              class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            >
            <video
              v-else-if="post.media[0]?.type === 'VIDEO'"
              :src="mediaSrc(post.media[0].url)"
              class="h-full w-full object-cover"
              muted
              preload="metadata"
            />
            <div v-else class="h-full w-full flex items-center justify-center text-gray-300">
              <PhotoIcon class="h-12 w-12" />
            </div>

            <!-- Multi-media badge -->
            <div v-if="post.media.length > 1" class="absolute top-2 right-2">
              <SquaresPlusIcon class="h-5 w-5 text-white drop-shadow" />
            </div>
            <!-- Video badge -->
            <div v-if="post.media[0]?.type === 'VIDEO'" class="absolute top-2 left-2">
              <PlayCircleIcon class="h-5 w-5 text-white drop-shadow" />
            </div>

            <!-- Hover overlay -->
            <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p v-if="post.caption" class="text-white text-xs text-center px-3 line-clamp-3">{{ post.caption }}</p>
            </div>

            <!-- Own: delete button -->
            <button
              v-if="isOwnProfile"
              class="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              @click.stop="confirmDeletePost(post.id)"
            >
              <XMarkIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Load more -->
        <div v-if="postsMeta.page < postsMeta.totalPages" class="mt-6 text-center">
          <button
            class="px-6 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            :disabled="loadingPosts"
            @click="loadMorePosts"
          >
            <span v-if="loadingPosts" class="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
            Cargar más
          </button>
        </div>
      </div>

      <!-- ── TAB: Reseñas ────────────────────────────────────────────── -->
      <div v-if="activeTab === 'reviews'">

        <!-- Rating summary -->
        <div class="card-premium p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
          <div class="text-center">
            <div class="text-6xl font-bold text-gray-900">{{ reviewStats.averageRating?.toFixed(1) ?? '—' }}</div>
            <div class="flex justify-center gap-0.5 mt-2">
              <StarIcon
                v-for="i in 5"
                :key="i"
                class="h-5 w-5"
                :class="i <= Math.round(reviewStats.averageRating ?? 0) ? 'text-amber-400' : 'text-gray-200'"
              />
            </div>
            <p class="text-xs text-gray-400 mt-1">{{ reviewStats.reviewsCount }} reseñas</p>
          </div>

          <!-- Stars breakdown (visual only) -->
          <div class="flex-1 space-y-1.5 w-full">
            <div v-for="star in [5,4,3,2,1]" :key="star" class="flex items-center gap-2 text-sm">
              <span class="w-4 text-gray-500 text-right">{{ star }}</span>
              <StarIcon class="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-amber-400 rounded-full transition-all duration-500"
                  :style="{ width: starPercent(star) + '%' }"
                />
              </div>
              <span class="w-6 text-gray-400 text-xs">{{ starCount(star) }}</span>
            </div>
          </div>
        </div>

        <!-- Review form -->
        <div v-if="isAuthenticated && !isOwnProfile && showReviewForm" class="card-premium p-6 mb-6">
          <h3 class="font-bold text-gray-800 mb-4">Tu reseña</h3>
          <div class="flex gap-1 mb-3">
            <button
              v-for="i in 5"
              :key="i"
              @click="reviewForm.rating = i"
            >
              <StarIcon
                class="h-8 w-8 transition-colors"
                :class="i <= reviewForm.rating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'"
              />
            </button>
          </div>
          <textarea
            v-model="reviewForm.comment"
            rows="3"
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red resize-none text-sm"
            placeholder="Comparte tu experiencia (opcional)..."
          />
          <div class="flex gap-2 mt-3 justify-end">
            <button class="px-4 py-2 text-gray-500 text-sm font-medium hover:text-gray-700" @click="showReviewForm = false">Cancelar</button>
            <button
              :disabled="reviewForm.rating === 0 || savingReview"
              class="px-5 py-2 bg-ifood-red text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-red-600 transition-colors"
              @click="handleSubmitReview"
            >
              <span v-if="savingReview" class="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              Publicar reseña
            </button>
          </div>
        </div>

        <button
          v-else-if="isAuthenticated && !isOwnProfile && !showReviewForm"
          class="mb-6 flex items-center gap-2 px-5 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-amber-300 hover:text-amber-500 transition-all w-full"
          @click="showReviewForm = true"
        >
          <StarIcon class="h-5 w-5" />
          <span class="font-medium text-sm">Escribir una reseña</span>
        </button>

        <!-- Reviews list -->
        <div v-if="loadingReviews" class="space-y-3">
          <div v-for="i in 3" :key="i" class="card-premium p-4 animate-pulse">
            <div class="flex gap-3">
              <div class="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-gray-200 rounded w-32" />
                <div class="h-3 bg-gray-200 rounded w-full" />
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="reviews.length === 0" class="text-center py-12 text-gray-400">
          <div class="text-4xl mb-2">⭐</div>
          <p class="font-medium">Sin reseñas todavía</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="review in reviews" :key="review.id" class="card-premium p-5">
            <div class="flex items-start gap-3">
              <div class="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-ifood-red to-red-700 flex items-center justify-center">
                <img v-if="review.author.avatar" :src="avatarSrc(review.author.avatar)" class="h-full w-full object-cover">
                <span v-else class="text-white text-sm font-bold">{{ review.author.firstName[0] }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <NuxtLink
                    v-if="review.author.username"
                    :to="`/p/${review.author.username}`"
                    class="font-semibold text-gray-900 hover:text-ifood-red transition-colors text-sm"
                  >
                    {{ review.author.firstName }} {{ review.author.lastName }}
                  </NuxtLink>
                  <span v-else class="font-semibold text-gray-900 text-sm">{{ review.author.firstName }} {{ review.author.lastName }}</span>
                  <div class="flex gap-0.5">
                    <StarIcon v-for="i in 5" :key="i" class="h-3.5 w-3.5" :class="i <= review.rating ? 'text-amber-400' : 'text-gray-200'" />
                  </div>
                  <span class="text-xs text-gray-400 ml-auto">{{ formatDate(review.createdAt) }}</span>
                </div>
                <p v-if="review.comment" class="text-sm text-gray-600">{{ review.comment }}</p>
              </div>
              <button
                v-if="currentUser?.id === review.author.id"
                class="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                @click="handleDeleteReview(review.id)"
              >
                <XMarkIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Modal: ver post ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="selectedPost" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="selectedPost = null">
          <div class="bg-white rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col sm:flex-row shadow-2xl">

            <!-- Media side -->
            <div class="sm:w-1/2 bg-black flex items-center justify-center min-h-[260px]">
              <img
                v-if="selectedPost.media[currentMediaIdx]?.type === 'IMAGE'"
                :src="mediaSrc(selectedPost.media[currentMediaIdx].url)"
                class="max-h-[70vh] max-w-full object-contain"
              >
              <video
                v-else-if="selectedPost.media[currentMediaIdx]?.type === 'VIDEO'"
                :src="mediaSrc(selectedPost.media[currentMediaIdx].url)"
                class="max-h-[70vh] max-w-full"
                controls
                autoplay
              />
              <!-- Prev/next for multi-media -->
              <template v-if="selectedPost.media.length > 1">
                <button
                  class="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/70"
                  @click="currentMediaIdx = Math.max(0, currentMediaIdx - 1)"
                >‹</button>
                <button
                  class="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/70"
                  @click="currentMediaIdx = Math.min(selectedPost.media.length - 1, currentMediaIdx + 1)"
                >›</button>
                <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                  <span v-for="(_, i) in selectedPost.media" :key="i" class="h-1.5 w-1.5 rounded-full" :class="i === currentMediaIdx ? 'bg-white' : 'bg-white/40'" />
                </div>
              </template>
            </div>

            <!-- Info side -->
            <div class="sm:w-1/2 flex flex-col">
              <div class="flex items-center gap-3 p-4 border-b border-gray-100">
                <div class="h-9 w-9 rounded-full bg-gradient-to-br from-ifood-red to-red-700 flex items-center justify-center overflow-hidden">
                  <img v-if="selectedPost.user.avatar" :src="avatarSrc(selectedPost.user.avatar)" class="h-full w-full object-cover">
                  <span v-else class="text-white text-sm font-bold">{{ selectedPost.user.firstName[0] }}</span>
                </div>
                <div>
                  <p class="font-semibold text-gray-900 text-sm">{{ selectedPost.user.firstName }} {{ selectedPost.user.lastName }}</p>
                  <p v-if="selectedPost.user.username" class="text-xs text-gray-400">@{{ selectedPost.user.username }}</p>
                </div>
                <button class="ml-auto text-gray-400 hover:text-gray-600" @click="selectedPost = null">
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-4">
                <!-- Edit mode -->
                <template v-if="editingCaption">
                  <textarea
                    v-model="editCaptionValue"
                    rows="5"
                    maxlength="2200"
                    class="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red resize-none"
                    placeholder="Escribe una descripción..."
                  />
                  <p class="text-xs text-gray-400 text-right mt-1">{{ editCaptionValue.length }}/2200</p>
                  <div class="flex gap-2 mt-2 justify-end">
                    <button class="px-3 py-1.5 text-xs text-gray-500 font-medium hover:text-gray-700" @click="cancelEditCaption">Cancelar</button>
                    <button
                      :disabled="savingCaption"
                      class="px-4 py-1.5 bg-ifood-red text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-red-600 flex items-center gap-1"
                      @click="saveCaption"
                    >
                      <span v-if="savingCaption" class="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardar
                    </button>
                  </div>
                </template>
                <!-- View mode -->
                <template v-else>
                  <p v-if="selectedPost.caption" class="text-sm text-gray-700 whitespace-pre-line">{{ selectedPost.caption }}</p>
                  <p v-else class="text-sm text-gray-400 italic">Sin descripción</p>
                </template>
              </div>
              <div class="p-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <div>
                  <p class="text-xs text-gray-400">{{ formatDateTime(selectedPost.createdAt) }}</p>
                  <p v-if="selectedPost.updatedAt !== selectedPost.createdAt" class="text-xs text-gray-400 italic">Editado {{ formatDateTime(selectedPost.updatedAt) }}</p>
                </div>
                <!-- Own post actions -->
                <div v-if="isOwnProfile && !editingCaption" class="flex gap-1">
                  <button
                    class="p-1.5 rounded-lg text-gray-400 hover:text-ifood-red hover:bg-red-50 transition-colors"
                    title="Editar descripción"
                    @click="startEditCaption"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar publicación"
                    @click="confirmDeletePost(selectedPost.id)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal: nueva publicación ─────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPostModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="showPostModal = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900 text-lg">Nueva publicación</h3>
              <button @click="showPostModal = false"><XMarkIcon class="h-5 w-5 text-gray-400" /></button>
            </div>

            <div class="p-5 space-y-4">
              <!-- Dropzone -->
              <div
                class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-ifood-red transition-colors"
                @click="triggerFileInput"
                @dragover.prevent
                @drop.prevent="onDrop"
              >
                <input ref="fileInput" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" class="hidden" @change="onFileChange">
                <template v-if="newPostFiles.length === 0">
                  <PhotoIcon class="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p class="text-sm text-gray-400">Arrastra o haz clic para subir fotos/videos</p>
                  <p class="text-xs text-gray-300 mt-1">Máximo 10 archivos · 50 MB c/u</p>
                </template>
                <div v-else class="flex flex-wrap gap-2 justify-center">
                  <div v-for="(f, i) in newPostPreviews" :key="i" class="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100">
                    <img v-if="f.type === 'image'" :src="f.preview" class="h-full w-full object-cover">
                    <div v-else class="h-full w-full flex items-center justify-center bg-gray-800">
                      <PlayCircleIcon class="h-8 w-8 text-white" />
                    </div>
                    <button
                      class="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                      @click.stop="removeFile(i)"
                    >×</button>
                  </div>
                  <button class="h-20 w-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-ifood-red" @click.stop="triggerFileInput">
                    <PlusCircleIcon class="h-8 w-8" />
                  </button>
                </div>
              </div>

              <!-- Caption -->
              <textarea
                v-model="newPostCaption"
                rows="3"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red resize-none text-sm"
                placeholder="Escribe una descripción..."
                maxlength="2200"
              />
              <p class="text-xs text-gray-400 text-right">{{ newPostCaption.length }}/2200</p>

              <!-- Error -->
              <p v-if="postError" class="text-sm text-red-500">{{ postError }}</p>
            </div>

            <div class="flex justify-end gap-3 px-5 pb-5">
              <button class="px-5 py-2 text-gray-500 font-medium hover:text-gray-700" @click="showPostModal = false">Cancelar</button>
              <button
                :disabled="newPostFiles.length === 0 || creatingPost"
                class="px-6 py-2.5 bg-ifood-red text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-red-600 transition-colors flex items-center gap-2"
                @click="handleCreatePost"
              >
                <span v-if="creatingPost" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publicar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal: seguidores / siguiendo ────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showFollowersModal || showFollowingModal"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          @click.self="showFollowersModal = showFollowingModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900">{{ showFollowersModal ? 'Seguidores' : 'Siguiendo' }}</h3>
              <button @click="showFollowersModal = showFollowingModal = false"><XMarkIcon class="h-5 w-5 text-gray-400" /></button>
            </div>
            <div class="overflow-y-auto flex-1 divide-y divide-gray-50">
              <div v-if="loadingFollowList" class="p-4 text-center text-gray-400 text-sm">Cargando...</div>
              <div v-for="u in followList" :key="u.id" class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div class="h-9 w-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-ifood-red to-red-700 flex items-center justify-center">
                  <img v-if="u.avatar" :src="avatarSrc(u.avatar)" class="h-full w-full object-cover">
                  <span v-else class="text-white text-sm font-bold">{{ u.firstName[0] }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 text-sm truncate">{{ u.firstName }} {{ u.lastName }}</p>
                  <p v-if="u.username" class="text-xs text-gray-400">@{{ u.username }}</p>
                </div>
                <NuxtLink v-if="u.username" :to="`/p/${u.username}`" class="text-xs text-ifood-red font-medium hover:underline" @click="showFollowersModal = showFollowingModal = false">
                  Ver
                </NuxtLink>
              </div>
              <div v-if="!loadingFollowList && followList.length === 0" class="p-6 text-center text-gray-400 text-sm">
                {{ showFollowersModal ? 'Sin seguidores aún' : 'No sigue a nadie aún' }}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  StarIcon,
  XMarkIcon,
  PhotoIcon,
  PlusCircleIcon,
  PlayCircleIcon,
  SquaresPlusIcon,
  CameraIcon,
} from '@heroicons/vue/24/outline'
import Swal from 'sweetalert2'
import { useProfiles, type ProfilePost } from '~/composables/useProfiles'
import { useAuth } from '~/composables/useAuth'

definePageMeta({ layout: false })

const route = useRoute()
const username = computed(() => route.params.username as string)

const {
  profile, posts, postsMeta, reviews, reviewStats,
  loading, loadingPosts, loadingReviews, error,
  fetchProfile, fetchPosts, uploadMedia, createPost, deletePost, updatePostCaption,
  follow, unfollow, fetchReviews, submitReview, deleteReview,
  getFollowers, getFollowing,
} = useProfiles()

const { user: currentUser, isAuthenticated, uploadAvatar } = useAuth()

// Layout dinámico: sin sidebar cuando no está autenticado
const layout = computed(() => isAuthenticated.value ? 'default' : 'public')

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarSrc(av: string) {
  return av.startsWith('http') ? av : `${apiUrl}${av}`
}
function mediaSrc(url: string) {
  return url.startsWith('http') ? url : `${apiUrl}${url}`
}
function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso))
}
function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const initials = computed(() => {
  if (!profile.value) return '?'
  return `${profile.value.firstName[0]}${profile.value.lastName[0]}`.toUpperCase()
})

const roleBadge = computed(() => {
  const map: Record<string, string> = {
    SUPERADMIN: 'bg-red-100 text-red-800',
    ADMIN: 'bg-purple-100 text-purple-800',
    COMMERCE: 'bg-blue-100 text-blue-800',
    FREELANCER: 'bg-amber-100 text-amber-800',
  }
  return map[profile.value?.role ?? ''] ?? 'bg-gray-100 text-gray-700'
})

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    SUPERADMIN: 'Super Admin', ADMIN: 'Admin', COMMERCE: 'Comercio', FREELANCER: 'Freelancer',
  }
  return map[profile.value?.role ?? ''] ?? profile.value?.role ?? ''
})

const isOwnProfile = computed(() => currentUser.value?.id === profile.value?.id)
const canPost = computed(() => ['COMMERCE', 'FREELANCER', 'SUPERADMIN', 'ADMIN'].includes(currentUser.value?.role ?? ''))

const tabs = [
  { key: 'posts', label: 'Publicaciones' },
  { key: 'reviews', label: 'Reseñas' },
]

// Star breakdown
function starCount(star: number) {
  return reviews.value.filter(r => r.rating === star).length
}
function starPercent(star: number) {
  if (reviews.value.length === 0) return 0
  return Math.round((starCount(star) / reviewStats.value.reviewsCount) * 100)
}

// ─── State ────────────────────────────────────────────────────────────────────

const activeTab = ref<'posts' | 'reviews'>('posts')
const followLoading = ref(false)

// Post modal
const showPostModal = ref(false)
const newPostCaption = ref('')
const newPostFiles = ref<File[]>([])
const newPostPreviews = ref<{ preview: string; type: 'image' | 'video' }[]>([])
const creatingPost = ref(false)
const postError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// Post viewer
const selectedPost = ref<ProfilePost | null>(null)
const currentMediaIdx = ref(0)

// Follow modal
const showFollowersModal = ref(false)
const showFollowingModal = ref(false)
const followList = ref<{ id: string; username?: string; firstName: string; lastName: string; avatar?: string }[]>([])
const loadingFollowList = ref(false)

// Reviews
const showReviewForm = ref(false)
const reviewForm = ref({ rating: 0, comment: '' })
const savingReview = ref(false)

// Avatar upload
const avatarFileInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)

// Post editing (in lightbox)
const editingCaption = ref(false)
const editCaptionValue = ref('')
const savingCaption = ref(false)

// ─── Actions ──────────────────────────────────────────────────────────────────

async function onAvatarFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingAvatar.value = true
  try {
    await uploadAvatar(file)
    // Refresh profile to get new avatar url
    if (profile.value?.username) await fetchProfile(profile.value.username)
  } finally {
    uploadingAvatar.value = false
    if (avatarFileInput.value) avatarFileInput.value.value = ''
  }
}

async function handleFollow() {
  if (!profile.value?.username) return
  followLoading.value = true
  try { await follow(profile.value.username) } finally { followLoading.value = false }
}

async function handleUnfollow() {
  if (!profile.value?.username) return
  followLoading.value = true
  try { await unfollow(profile.value.username) } finally { followLoading.value = false }
}

async function loadMorePosts() {
  if (!profile.value?.username) return
  await fetchPosts(profile.value.username, postsMeta.value.page + 1)
}

function openPost(post: ProfilePost) {
  selectedPost.value = post
  currentMediaIdx.value = 0
  editingCaption.value = false
  editCaptionValue.value = ''
}

async function confirmDeletePost(id: string) {
  const result = await Swal.fire({
    title: '¿Eliminar publicación?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#e53e3e',
    cancelButtonColor: '#718096',
    reverseButtons: true,
  })
  if (!result.isConfirmed) return
  if (selectedPost.value?.id === id) selectedPost.value = null
  await deletePost(id)
}

function startEditCaption() {
  editCaptionValue.value = selectedPost.value?.caption ?? ''
  editingCaption.value = true
}

function cancelEditCaption() {
  editingCaption.value = false
  editCaptionValue.value = ''
}

async function saveCaption() {
  if (!selectedPost.value) return
  savingCaption.value = true
  try {
    await updatePostCaption(selectedPost.value.id, editCaptionValue.value)
    // Update the selected post locally
    selectedPost.value = { ...selectedPost.value, caption: editCaptionValue.value, updatedAt: new Date().toISOString() }
    editingCaption.value = false
  } finally {
    savingCaption.value = false
  }
}

// File handling
function triggerFileInput() { fileInput.value?.click() }

function processFiles(files: FileList | File[]) {
  const arr = Array.from(files)
  const remaining = 10 - newPostFiles.value.length
  const toAdd = arr.slice(0, remaining)
  toAdd.forEach(f => {
    newPostFiles.value.push(f)
    const isVideo = f.type.startsWith('video')
    if (isVideo) {
      newPostPreviews.value.push({ preview: '', type: 'video' })
    } else {
      const reader = new FileReader()
      const idx = newPostPreviews.value.length
      newPostPreviews.value.push({ preview: '', type: 'image' })
      reader.onload = e => { newPostPreviews.value[idx].preview = e.target?.result as string }
      reader.readAsDataURL(f)
    }
  })
}

function onFileChange(e: Event) { processFiles((e.target as HTMLInputElement).files ?? []) }
function onDrop(e: DragEvent) { processFiles(e.dataTransfer?.files ?? []) }
function removeFile(i: number) {
  newPostFiles.value.splice(i, 1)
  newPostPreviews.value.splice(i, 1)
}

async function handleCreatePost() {
  if (newPostFiles.value.length === 0) return
  creatingPost.value = true
  postError.value = ''
  try {
    const uploaded = await uploadMedia(newPostFiles.value)
    await createPost(newPostCaption.value, uploaded)
    showPostModal.value = false
    newPostCaption.value = ''
    newPostFiles.value = []
    newPostPreviews.value = []
  } catch (e: any) {
    postError.value = e?.data?.message ?? 'Error al publicar'
  } finally {
    creatingPost.value = false
  }
}

// Reviews
async function handleSubmitReview() {
  if (!profile.value || reviewForm.value.rating === 0) return
  savingReview.value = true
  try {
    await submitReview(profile.value.id, reviewForm.value.rating, reviewForm.value.comment)
    showReviewForm.value = false
    reviewForm.value = { rating: 0, comment: '' }
    await fetchReviews(username.value)
    if (profile.value?.username) await fetchProfile(profile.value.username)
  } finally {
    savingReview.value = false
  }
}

async function handleDeleteReview(id: string) {
  if (!confirm('¿Eliminar tu reseña?')) return
  await deleteReview(id)
  if (profile.value?.username) await fetchProfile(profile.value.username)
}

// ─── Follow list modal ────────────────────────────────────────────────────────

watch(showFollowersModal, async (val) => {
  if (!val || !profile.value?.username) return
  loadingFollowList.value = true
  try {
    const res = await $fetch<{ data: typeof followList.value }>(
      `${apiUrl}/api/profiles/${profile.value.username}/followers`,
      { headers: useAuth().getHeaders() },
    )
    followList.value = res.data
  } finally { loadingFollowList.value = false }
})

watch(showFollowingModal, async (val) => {
  if (!val || !profile.value?.username) return
  loadingFollowList.value = true
  try {
    const res = await $fetch<{ data: typeof followList.value }>(
      `${apiUrl}/api/profiles/${profile.value.username}/following`,
      { headers: useAuth().getHeaders() },
    )
    followList.value = res.data
  } finally { loadingFollowList.value = false }
})

watch(activeTab, (tab) => {
  if (tab === 'reviews' && reviews.value.length === 0 && profile.value?.username) {
    fetchReviews(profile.value.username)
  }
})

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await fetchProfile(username.value)
  if (profile.value?.username) {
    await fetchPosts(profile.value.username)
  }
})

watch(username, async (u) => {
  await fetchProfile(u)
  if (profile.value?.username) await fetchPosts(profile.value.username)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
