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
      <NuxtLink to="/" class="inline-flex items-center gap-2 px-5 py-2.5 bg-workplace-red text-white rounded-xl font-semibold">
        Volver al inicio
      </NuxtLink>
    </div>

    <template v-else>
      <!-- ── Header del perfil ─────────────────────────────────────────── -->
      <div class="card-premium overflow-hidden mb-6">

        <!-- Banner / portada -->
        <div class="relative h-48 sm:h-56 bg-gradient-to-br from-workplace-red/80 to-red-800 group">
          <img
            v-if="coverSrc"
            :src="coverSrc"
            alt="Portada"
            class="h-full w-full object-cover"
          >
          <!-- Botón cambiar portada — solo perfil propio -->
          <button
            v-if="isOwnProfile"
            type="button"
            :disabled="uploadingCover"
            class="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-semibold rounded-lg backdrop-blur-sm transition-all disabled:opacity-60"
            @click="coverFileInput?.click()"
          >
            <span v-if="uploadingCover" class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <CameraIcon v-else class="h-3.5 w-3.5" />
            {{ uploadingCover ? 'Subiendo...' : 'Cambiar portada' }}
          </button>
          <input
            ref="coverFileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            @change="onCoverFileSelected"
          >
        </div>

        <!-- Contenido debajo del banner -->
        <div class="px-6 pb-6">
          <div class="flex flex-col sm:flex-row gap-4 items-start">

            <!-- Avatar (superpuesto sobre el banner) -->
            <div class="flex-shrink-0 relative -mt-14">
              <div class="h-28 w-28 rounded-full overflow-hidden ring-4 ring-white shadow-xl">
                <img v-if="profile.avatar" :src="avatarSrc(profile.avatar)" :alt="profile.firstName" class="h-full w-full object-cover">
                <div v-else class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center">
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
                <span v-if="uploadingAvatar" class="h-4 w-4 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
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
            <div class="flex-1 min-w-0 pt-3 sm:pt-2">
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
                <button class="hover:text-workplace-red transition-colors" @click="activeTab = 'posts'">
                  <div class="text-xl font-bold text-gray-900">{{ profile.postsCount }}</div>
                  <div class="text-xs text-gray-500">publicaciones</div>
                </button>
                <button class="hover:text-workplace-red transition-colors" @click="showFollowersModal = true">
                  <div class="text-xl font-bold text-gray-900">{{ profile.followersCount }}</div>
                  <div class="text-xs text-gray-500">seguidores</div>
                </button>
                <button class="hover:text-workplace-red transition-colors" @click="showFollowingModal = true">
                  <div class="text-xl font-bold text-gray-900">{{ profile.followingCount }}</div>
                  <div class="text-xs text-gray-500">siguiendo</div>
                </button>
                <button class="hover:text-workplace-red transition-colors" @click="activeTab = 'reviews'">
                  <div class="flex items-center gap-1 justify-center">
                    <span class="text-xl font-bold text-gray-900">{{ profile.rating ?? '—' }}</span>
                    <StarIcon class="h-4 w-4 text-amber-400" />
                  </div>
                  <div class="text-xs text-gray-500">{{ profile.reviewsCount }} reseñas</div>
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div v-if="isAuthenticated && currentUser?.id !== profile.id" class="flex gap-2 flex-shrink-0 pt-3 sm:pt-2">
              <button
                v-if="!profile.isFollowing"
                class="px-5 py-2 bg-workplace-red text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all"
                :disabled="followLoading"
                @click="handleFollow"
              >
                <span v-if="followLoading" class="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span v-else>Seguir</span>
              </button>
              <button
                v-else
                class="px-5 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-red-300 hover:text-workplace-red transition-all"
                :disabled="followLoading"
                @click="handleUnfollow"
              >
                Siguiendo
              </button>
            </div>

            <!-- Own profile badge + settings -->
            <div v-else-if="isAuthenticated && currentUser?.id === profile.id" class="flex-shrink-0 pt-3 sm:pt-2 flex items-center gap-2">
              <span class="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Tu perfil</span>
              <button
                class="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                title="Configurar perfil público"
                @click="openSettingsPanel"
              >
                <svg class="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </button>
            </div>

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
            ? 'border-workplace-red text-workplace-red'
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
            class="w-full flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-workplace-red hover:text-workplace-red transition-all"
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
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div
            v-for="post in posts"
            :key="post.id"
            class="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group bg-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300"
            @click="openPost(post)"
          >
            <!-- Thumbnail -->
            <img
              v-if="post.media[0]?.type === 'IMAGE'"
              :src="mediaSrc(post.media[0].url)"
              :alt="post.caption ?? ''"
              class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
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

            <!-- Top badges -->
            <div class="absolute top-2.5 left-2.5 flex gap-1.5">
              <!-- Video -->
              <span v-if="post.media[0]?.type === 'VIDEO'" class="h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <PlayCircleIcon class="h-3.5 w-3.5 text-white" />
              </span>
              <!-- Foto individual -->
              <span v-else-if="post.media.length === 1 && post.media[0]?.type === 'IMAGE'" class="h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <PhotoIcon class="h-3.5 w-3.5 text-white" />
              </span>
            </div>
            <div class="absolute top-2.5 right-2.5 flex gap-1.5">
              <!-- Multi-media -->
              <span v-if="post.media.length > 1" class="h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <SquaresPlusIcon class="h-3.5 w-3.5 text-white" />
              </span>
            </div>

            <!-- Hover overlay with stats -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1.5 text-white text-sm font-bold drop-shadow-sm">
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  {{ post.likesCount }}
                </span>
                <span class="flex items-center gap-1.5 text-white text-sm font-bold drop-shadow-sm">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                  {{ post.commentsCount }}
                </span>
              </div>
            </div>

            <!-- Own: delete button -->
            <button
              v-if="isOwnProfile"
              class="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
              @click.stop="confirmDeletePost(post.id)"
            >
              <XMarkIcon class="h-3.5 w-3.5" />
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

      <!-- ── TAB: Catálogo ──────────────────────────────────────────── -->
      <div v-if="activeTab === 'catalog'">
        <div v-if="catalogLoading && catalogProducts.length === 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="i in 6" :key="i" class="card-premium p-3 animate-pulse">
            <div class="aspect-square bg-gray-200 rounded-xl mb-2" />
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-1" />
            <div class="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div v-else-if="catalogProducts.length === 0" class="text-center py-16 text-gray-400">
          <div class="text-5xl mb-3">🛍️</div>
          <p class="font-medium">Sin productos disponibles</p>
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            v-for="product in catalogProducts"
            :key="product.id"
            class="card-premium overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
            @click="openOrderModal(product)"
          >
            <div class="aspect-square bg-gray-100 relative overflow-hidden">
              <img
                v-if="product.image"
                :src="product.image.startsWith('http') ? product.image : `${apiUrl}${product.image}`"
                :alt="product.name"
                class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              >
              <div v-else class="h-full w-full flex items-center justify-center">
                <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="bg-white text-red-600 font-bold text-xs px-3 py-1.5 rounded-full shadow">Pedir</span>
              </div>
            </div>
            <div class="p-3">
              <p class="font-semibold text-gray-900 text-sm line-clamp-1">{{ product.name }}</p>
              <p class="text-red-600 font-black text-sm mt-0.5">${{ new Intl.NumberFormat('es-CO').format(product.price) }}</p>
              <p v-if="product.category?.name" class="text-xs text-gray-400 mt-0.5">{{ product.category.name }}</p>
            </div>
          </div>
        </div>
        <div v-if="catalogProducts.length < catalogTotal" class="mt-6 text-center">
          <button
            class="px-6 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            :disabled="catalogLoading"
            @click="fetchCatalogProducts(catalogPage + 1)"
          >
            <span v-if="catalogLoading" class="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
            Cargar más
          </button>
        </div>
        <!-- Toast pedido -->
        <Teleport to="body">
          <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div v-if="catalogToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold">
              {{ catalogToast }}
            </div>
          </Transition>
        </Teleport>
      </div>

      <!-- ── TAB: Servicios ──────────────────────────────────────────── -->
      <div v-if="activeTab === 'services'">
        <div v-if="servicesLoading && profileServices.length === 0" class="space-y-3">
          <div v-for="i in 3" :key="i" class="card-premium p-4 animate-pulse flex gap-4">
            <div class="h-16 w-16 bg-gray-200 rounded-xl flex-shrink-0" />
            <div class="flex-1 space-y-2 pt-1">
              <div class="h-4 bg-gray-200 rounded w-2/3" />
              <div class="h-3 bg-gray-200 rounded w-full" />
              <div class="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
        <div v-else-if="profileServices.length === 0" class="text-center py-16 text-gray-400">
          <div class="text-5xl mb-3">🛠️</div>
          <p class="font-medium">Sin servicios publicados</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="srv in profileServices"
            :key="srv.id"
            class="card-premium p-4 flex gap-4 hover:shadow-lg transition-all"
          >
            <div class="h-16 w-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                v-if="srv.image"
                :src="srv.image.startsWith('http') ? srv.image : `${apiUrl}${srv.image}`"
                :alt="srv.name"
                class="h-full w-full object-cover"
              >
              <div v-else class="h-full w-full flex items-center justify-center text-gray-300">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-gray-900 text-sm">{{ srv.name }}</p>
              <p v-if="srv.description" class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ srv.description }}</p>
              <div class="flex items-center gap-3 mt-2 flex-wrap">
                <span class="text-red-600 font-black text-sm">${{ new Intl.NumberFormat('es-CO').format(srv.price) }}<span class="text-gray-400 font-normal text-xs"> / {{ srv.priceUnit ?? 'servicio' }}</span></span>
                <span v-if="srv.category?.name" class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{{ srv.category.name }}</span>
              </div>
            </div>
            <div class="flex-shrink-0 flex items-center">
              <button
                v-if="!isOwnProfile"
                class="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors"
                @click="openServiceReqModal(srv)"
              >
                Solicitar
              </button>
            </div>
          </div>
        </div>
        <!-- Toast servicio -->
        <Teleport to="body">
          <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div v-if="serviceToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold">
              {{ serviceToast }}
            </div>
          </Transition>
        </Teleport>
      </div>

      <!-- ── TAB: Reseñas ────────────────────────────────────────────── -->
      <div v-if="activeTab === 'reviews'">

        <!-- Rating summary -->
        <div class="card-premium p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
          <div class="text-center">
            <div class="text-6xl font-bold text-gray-900">{{ reviewStats.averageRating?.toFixed(1) ?? '—' }}</div>
            <!-- Estrellas con relleno parcial según puntuación exacta -->
            <div class="flex justify-center gap-0.5 mt-2">
              <span v-for="i in 5" :key="i" class="relative h-5 w-5 inline-block">
                <!-- Estrella vacía (fondo) -->
                <StarIcon class="h-5 w-5 text-gray-200 absolute inset-0" />
                <!-- Estrella llena recortada al % de relleno -->
                <span
                  class="absolute inset-0 overflow-hidden"
                  :style="{ width: starFill(i, reviewStats.averageRating ?? 0) + '%' }"
                >
                  <StarIcon class="h-5 w-5 text-amber-400" />
                </span>
              </span>
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
              <div class="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center">
                <img v-if="review.author.avatar" :src="avatarSrc(review.author.avatar)" class="h-full w-full object-cover">
                <span v-else class="text-white text-sm font-bold">{{ review.author.firstName[0] }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <NuxtLink
                    v-if="review.author.username"
                    :to="`/p/${review.author.username}`"
                    class="font-semibold text-gray-900 hover:text-workplace-red transition-colors text-sm"
                  >
                    {{ review.author.firstName }} {{ review.author.lastName }}
                  </NuxtLink>
                  <span v-else class="font-semibold text-gray-900 text-sm">{{ review.author.firstName }} {{ review.author.lastName }}</span>
                  <div class="flex gap-0.5">
                    <span v-for="i in 5" :key="i" class="relative h-3.5 w-3.5 inline-block">
                      <StarIcon class="h-3.5 w-3.5 text-gray-200 absolute inset-0" />
                      <span class="absolute inset-0 overflow-hidden" :style="{ width: starFill(i, review.rating) + '%' }">
                        <StarIcon class="h-3.5 w-3.5 text-amber-400" />
                      </span>
                    </span>
                  </div>
                  <span
                    v-if="review.verifiedOrderId || review.verifiedRequestId"
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 flex-shrink-0"
                    title="El autor completó una compra o servicio real con este perfil"
                  >
                    ✓ Compra verificada
                  </span>
                  <span class="text-xs text-gray-400 ml-auto">{{ formatDateTime(review.createdAt) }}</span>
                </div>
                <p v-if="review.comment" class="text-sm text-gray-600">{{ review.comment }}</p>

                <!-- Respuesta del negocio/freelancer reseñado -->
                <div v-if="review.response" class="mt-3 ml-2 pl-3 border-l-2 border-gray-200">
                  <p class="text-xs font-semibold text-gray-700">Respuesta de {{ profile?.firstName }}</p>
                  <p class="text-sm text-gray-600 mt-0.5">{{ review.response }}</p>
                  <button
                    v-if="currentUser?.id === profile?.id"
                    class="text-xs text-gray-400 hover:text-red-500 mt-1"
                    @click="handleDeleteResponse(review.id)"
                  >
                    Eliminar respuesta
                  </button>
                </div>
                <button
                  v-else-if="currentUser?.id === profile?.id"
                  class="text-xs font-semibold text-workplace-red hover:underline mt-2"
                  @click="openResponseForm(review)"
                >
                  Responder
                </button>

                <!-- Form de respuesta inline -->
                <div v-if="respondingReviewId === review.id" class="mt-2 flex gap-2">
                  <input
                    v-model="responseDraft"
                    type="text"
                    maxlength="1000"
                    placeholder="Escribe una respuesta pública…"
                    class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-200"
                    @keyup.enter="handleSubmitResponse"
                  />
                  <button
                    :disabled="savingResponse || !responseDraft.trim()"
                    class="text-xs font-semibold bg-workplace-red text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                    @click="handleSubmitResponse"
                  >
                    Enviar
                  </button>
                  <button class="text-xs text-gray-400 px-2" @click="respondingReviewId = null">Cancelar</button>
                </div>

                <!-- Form de reporte inline -->
                <div v-if="reportingReviewId === review.id" class="mt-2 flex gap-2">
                  <input
                    v-model="reportReason"
                    type="text"
                    maxlength="500"
                    placeholder="¿Por qué reportas esta reseña? (mín. 5 caracteres)"
                    class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-200"
                    @keyup.enter="handleSubmitReport"
                  />
                  <button
                    :disabled="sendingReport || reportReason.trim().length < 5"
                    class="text-xs font-semibold bg-gray-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                    @click="handleSubmitReport"
                  >
                    Reportar
                  </button>
                  <button class="text-xs text-gray-400 px-2" @click="reportingReviewId = null">Cancelar</button>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <button
                  v-if="currentUser?.id === review.author.id"
                  class="text-gray-300 hover:text-red-500 transition-colors"
                  title="Eliminar mi reseña"
                  @click="handleDeleteReview(review.id)"
                >
                  <XMarkIcon class="h-4 w-4" />
                </button>
                <button
                  v-else-if="currentUser && currentUser.id !== profile?.id"
                  class="text-gray-300 hover:text-amber-500 transition-colors text-xs"
                  title="Reportar reseña"
                  @click="openReportForm(review.id)"
                >
                  ⚑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Modal: ver post ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selectedPost"
          class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          @click.self="selectedPost = null"
        >
          <div class="bg-white rounded-3xl overflow-hidden w-full max-w-5xl max-h-[92vh] flex flex-col sm:flex-row shadow-2xl ring-1 ring-black/10">

            <!-- ── Media side ──────────────────────────────────────────── -->
            <div class="relative sm:w-[55%] bg-black flex items-center justify-center min-h-[240px] sm:min-h-0 flex-shrink-0">
              <img
                v-if="selectedPost.media[currentMediaIdx]?.type === 'IMAGE'"
                :src="mediaSrc(selectedPost.media[currentMediaIdx].url)"
                class="w-full h-full object-contain max-h-[50vh] sm:max-h-[92vh]"
              >
              <video
                v-else-if="selectedPost.media[currentMediaIdx]?.type === 'VIDEO'"
                :src="mediaSrc(selectedPost.media[currentMediaIdx].url)"
                class="w-full h-full max-h-[50vh] sm:max-h-[92vh]"
                controls
                autoplay
              />
              <div v-else class="flex items-center justify-center h-full w-full text-gray-600">
                <PhotoIcon class="h-16 w-16 opacity-30" />
              </div>

              <!-- Prev/Next buttons -->
              <template v-if="selectedPost.media.length > 1">
                <button
                  class="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center text-lg font-light backdrop-blur-sm transition-all"
                  @click.stop="currentMediaIdx = Math.max(0, currentMediaIdx - 1)"
                >‹</button>
                <button
                  class="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center text-lg font-light backdrop-blur-sm transition-all"
                  @click.stop="currentMediaIdx = Math.min(selectedPost.media.length - 1, currentMediaIdx + 1)"
                >›</button>
                <!-- Dot indicators -->
                <div class="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                  <button
                    v-for="(_, i) in selectedPost.media"
                    :key="i"
                    class="rounded-full transition-all"
                    :class="i === currentMediaIdx ? 'h-2 w-4 bg-white' : 'h-2 w-2 bg-white/40 hover:bg-white/60'"
                    @click.stop="currentMediaIdx = i"
                  />
                </div>
              </template>

              <!-- Media count badge -->
              <div v-if="selectedPost.media.length > 1" class="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                {{ currentMediaIdx + 1 }} / {{ selectedPost.media.length }}
              </div>
            </div>

            <!-- ── Info side ───────────────────────────────────────────── -->
            <div class="flex flex-col flex-1 min-w-0 min-h-0">

              <!-- Header -->
              <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <NuxtLink
                  v-if="selectedPost.user.username"
                  :to="`/p/${selectedPost.user.username}`"
                  class="flex items-center gap-3 group min-w-0"
                  @click="selectedPost = null"
                >
                  <div class="h-10 w-10 rounded-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover:ring-workplace-red/30 transition-all">
                    <img v-if="selectedPost.user.avatar" :src="avatarSrc(selectedPost.user.avatar)" class="h-full w-full object-cover">
                    <span v-else class="text-white text-sm font-bold">{{ selectedPost.user.firstName[0] }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-gray-900 text-sm leading-tight group-hover:text-workplace-red transition-colors">{{ selectedPost.user.firstName }} {{ selectedPost.user.lastName }}</p>
                    <p class="text-xs text-gray-400">@{{ selectedPost.user.username }}</p>
                  </div>
                </NuxtLink>
                <div v-else class="flex items-center gap-3 min-w-0">
                  <div class="h-10 w-10 rounded-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img v-if="selectedPost.user.avatar" :src="avatarSrc(selectedPost.user.avatar)" class="h-full w-full object-cover">
                    <span v-else class="text-white text-sm font-bold">{{ selectedPost.user.firstName[0] }}</span>
                  </div>
                  <p class="font-bold text-gray-900 text-sm">{{ selectedPost.user.firstName }} {{ selectedPost.user.lastName }}</p>
                </div>

                <!-- Own actions -->
                <div v-if="isOwnProfile && !editingCaption" class="ml-auto flex items-center gap-1 flex-shrink-0">
                  <button
                    class="h-8 w-8 rounded-xl text-gray-400 hover:text-workplace-red hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="Editar descripción"
                    @click="startEditCaption"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    class="h-8 w-8 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="Eliminar publicación"
                    @click="confirmDeletePost(selectedPost.id)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                  <div class="w-px h-5 bg-gray-200 mx-1" />
                </div>
                <button
                  class="ml-auto h-8 w-8 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0"
                  :class="{ 'ml-0': isOwnProfile && !editingCaption }"
                  @click="selectedPost = null"
                >
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>

              <!-- Caption / Edit caption -->
              <div class="px-5 py-4 flex-shrink-0 border-b border-gray-50">
                <template v-if="editingCaption">
                  <textarea
                    v-model="editCaptionValue"
                    rows="3"
                    maxlength="2200"
                    class="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-workplace-red/15 focus:border-workplace-red resize-none transition-all"
                    placeholder="Escribe una descripción..."
                    autofocus
                  />
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-xs text-gray-400">{{ editCaptionValue.length }}/2200</span>
                    <div class="flex gap-2">
                      <button class="px-3.5 py-1.5 text-sm text-gray-500 font-medium hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" @click="cancelEditCaption">Cancelar</button>
                      <button
                        :disabled="savingCaption"
                        class="px-4 py-1.5 bg-workplace-red text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-red-600 transition-colors flex items-center gap-1.5"
                        @click="saveCaption"
                      >
                        <span v-if="savingCaption" class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Guardar
                      </button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <p v-if="selectedPost.caption" class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ selectedPost.caption }}</p>
                  <p v-else class="text-sm text-gray-400 italic">Sin descripción</p>
                  <p class="text-xs text-gray-400 mt-2">{{ formatDateTime(selectedPost.createdAt) }}</p>
                </template>
              </div>

              <!-- Likes & comments action bar -->
              <div class="flex items-center gap-1 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <!-- Like button -->
                <button
                  class="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all"
                  :class="selectedPost.isLiked
                    ? 'text-red-500 bg-red-50 hover:bg-red-100'
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50'"
                  :disabled="!isAuthenticated || likingPostId === selectedPost.id"
                  @click="handleToggleLike(selectedPost)"
                >
                  <svg
                    class="h-5 w-5 transition-all duration-200"
                    :class="selectedPost.isLiked ? 'scale-110' : ''"
                    :fill="selectedPost.isLiked ? 'currentColor' : 'none'"
                    stroke="currentColor"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                  <span>{{ selectedPost.likesCount }}</span>
                  <span class="hidden sm:inline text-xs font-normal opacity-70">me gusta</span>
                </button>

                <!-- Comments count -->
                <div class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <span class="font-semibold">{{ selectedPost.commentsCount }}</span>
                  <span class="hidden sm:inline text-xs font-normal opacity-70">comentarios</span>
                </div>
              </div>

              <!-- Comments list -->
              <div class="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4">
                <!-- Skeleton -->
                <div v-if="loadingComments" class="space-y-4">
                  <div v-for="i in 4" :key="i" class="flex gap-3 animate-pulse">
                    <div class="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0" />
                    <div class="flex-1 space-y-2 pt-1">
                      <div class="h-3 bg-gray-200 rounded-full w-28" />
                      <div class="h-3 bg-gray-200 rounded-full w-3/4" />
                    </div>
                  </div>
                </div>

                <!-- Empty -->
                <div v-else-if="postComments.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-300">
                  <svg class="h-10 w-10 mb-2 opacity-50" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <p class="text-sm font-medium">Sin comentarios aún</p>
                  <p class="text-xs mt-0.5">¡Sé el primero en comentar!</p>
                </div>

                <!-- Comment items -->
                <div
                  v-for="comment in postComments"
                  :key="comment.id"
                  class="flex gap-3 group/comment"
                >
                  <!-- Avatar -->
                  <div class="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center ring-2 ring-white shadow-sm">
                    <img v-if="comment.user.avatar" :src="avatarSrc(comment.user.avatar)" class="h-full w-full object-cover">
                    <span v-else class="text-white text-xs font-bold">{{ comment.user.firstName[0] }}</span>
                  </div>

                  <div class="flex-1 min-w-0">
                    <!-- Edit mode -->
                    <template v-if="editingCommentId === comment.id">
                      <div class="bg-gray-50 rounded-2xl p-3 border-2 border-workplace-red/20">
                        <input
                          v-model="editingCommentValue"
                          class="w-full bg-transparent text-sm text-gray-800 focus:outline-none"
                          autofocus
                          @keydown.enter.prevent="saveEditComment(comment)"
                          @keydown.escape="editingCommentId = null"
                        >
                      </div>
                      <div class="flex gap-3 mt-1.5 pl-1">
                        <button class="text-xs text-gray-400 hover:text-gray-700 font-medium transition-colors" @click="editingCommentId = null">Cancelar</button>
                        <button
                          :disabled="savingEditComment || !editingCommentValue.trim()"
                          class="text-xs text-workplace-red font-bold hover:text-red-700 disabled:opacity-40 transition-colors"
                          @click="saveEditComment(comment)"
                        >Guardar</button>
                      </div>
                    </template>

                    <!-- View mode -->
                    <template v-else>
                      <div class="bg-gray-50 rounded-2xl px-3.5 py-2.5 inline-block max-w-full">
                        <NuxtLink
                          v-if="comment.user.username"
                          :to="`/p/${comment.user.username}`"
                          class="text-xs font-bold text-gray-900 hover:text-workplace-red transition-colors"
                          @click="selectedPost = null"
                        >{{ comment.user.firstName }} {{ comment.user.lastName }}</NuxtLink>
                        <span v-else class="text-xs font-bold text-gray-900">{{ comment.user.firstName }} {{ comment.user.lastName }}</span>
                        <p class="text-sm text-gray-700 mt-0.5 leading-relaxed break-words">{{ comment.content }}</p>
                      </div>
                      <p class="text-[11px] text-gray-400 mt-1 pl-1">{{ formatDate(comment.createdAt) }}</p>
                    </template>
                  </div>

                  <!-- Actions -->
                  <div
                    v-if="currentUser?.id === comment.user.id && editingCommentId !== comment.id"
                    class="flex gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity flex-shrink-0 pt-1"
                  >
                    <button
                      class="h-7 w-7 rounded-lg text-gray-300 hover:text-workplace-red hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="Editar"
                      @click="startEditComment(comment)"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button
                      class="h-7 w-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="Eliminar"
                      @click="handleDeleteComment(comment)"
                    >
                      <XMarkIcon class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Comment input -->
              <div v-if="isAuthenticated" class="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center ring-2 ring-white shadow-sm">
                    <img v-if="currentUser?.avatar" :src="avatarSrc(currentUser.avatar)" class="h-full w-full object-cover">
                    <span v-else class="text-white text-xs font-bold">{{ currentUser?.firstName?.[0] ?? '?' }}</span>
                  </div>
                  <div class="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:border-workplace-red focus-within:ring-4 focus-within:ring-workplace-red/10 transition-all">
                    <input
                      v-model="commentInput"
                      type="text"
                      class="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none min-w-0"
                      placeholder="Añade un comentario..."
                      maxlength="1000"
                      @keydown.enter.prevent="handleSendComment"
                    >
                    <button
                      :disabled="!commentInput.trim() || sendingComment"
                      class="text-workplace-red font-bold text-sm disabled:opacity-30 hover:text-red-700 transition-colors flex-shrink-0 flex items-center gap-1.5"
                      @click="handleSendComment"
                    >
                      <span v-if="sendingComment" class="inline-block h-4 w-4 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
                      <template v-else>
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      </template>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Not logged in nudge -->
              <div v-else class="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <p class="text-xs text-gray-400 text-center">
                  <NuxtLink to="/login" class="text-workplace-red font-semibold hover:underline">Inicia sesión</NuxtLink>
                  para dar like y comentar
                </p>
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
                class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-workplace-red transition-colors"
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
                  <button class="h-20 w-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-workplace-red" @click.stop="triggerFileInput">
                    <PlusCircleIcon class="h-8 w-8" />
                  </button>
                </div>
              </div>

              <!-- Caption -->
              <textarea
                v-model="newPostCaption"
                rows="3"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red resize-none text-sm"
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
                class="px-6 py-2.5 bg-workplace-red text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-red-600 transition-colors flex items-center gap-2"
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

    <!-- ── Modal: Order (catálogo) ──────────────────────────────────────── -->
    <ModalsCatalogOrderModal
      v-model="showOrderModal"
      :product="orderTarget"
      @success="onOrderSuccess"
    />

    <!-- ── Modal: Solicitud de servicio ──────────────────────────────────── -->
    <ModalsCatalogServiceRequestModal
      v-model="showServiceReqModal"
      :service="serviceReqTarget"
      @success="onServiceReqSuccess"
    />

    <!-- ── Panel: Configuración del perfil ───────────────────────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showSettingsPanel" class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="showSettingsPanel = false">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showSettingsPanel = false" />
          <Transition
            enter-active-class="duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
          >
            <div v-if="showSettingsPanel" class="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <!-- Handle mobile -->
              <div class="flex justify-center pt-3 pb-1 sm:hidden">
                <div class="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <!-- Header -->
              <div class="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <h2 class="text-base font-black text-gray-900">Configuración del perfil</h2>
                </div>
                <button class="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" @click="showSettingsPanel = false">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <!-- Body -->
              <div class="px-5 py-5 space-y-4">
                <p class="text-xs text-gray-400">Controla qué secciones son visibles en tu perfil público.</p>

                <!-- Toggle: Catálogo -->
                <div class="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p class="font-semibold text-gray-800 text-sm">Catálogo de productos</p>
                    <p class="text-xs text-gray-400 mt-0.5">Muestra tus productos disponibles a la venta</p>
                  </div>
                  <button
                    class="relative w-11 h-6 rounded-full transition-colors duration-200"
                    :class="settingsForm.showCatalog ? 'bg-red-500' : 'bg-gray-200'"
                    @click="settingsForm.showCatalog = !settingsForm.showCatalog"
                  >
                    <span
                      class="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-200"
                      :class="settingsForm.showCatalog ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                </div>

                <!-- Toggle: Servicios -->
                <div class="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p class="font-semibold text-gray-800 text-sm">Servicios</p>
                    <p class="text-xs text-gray-400 mt-0.5">Muestra los servicios que ofreces</p>
                  </div>
                  <button
                    class="relative w-11 h-6 rounded-full transition-colors duration-200"
                    :class="settingsForm.showServices ? 'bg-red-500' : 'bg-gray-200'"
                    @click="settingsForm.showServices = !settingsForm.showServices"
                  >
                    <span
                      class="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-200"
                      :class="settingsForm.showServices ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                </div>

                <!-- Guardar -->
                <button
                  :disabled="savingSettings"
                  class="w-full py-3 bg-red-600 text-white font-black text-sm rounded-2xl hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  @click="saveSettings"
                >
                  <span v-if="savingSettings" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardar cambios
                </button>
              </div>
            </div>
          </Transition>
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
                <div class="h-9 w-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center">
                  <img v-if="u.avatar" :src="avatarSrc(u.avatar)" class="h-full w-full object-cover">
                  <span v-else class="text-white text-sm font-bold">{{ u.firstName[0] }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 text-sm truncate">{{ u.firstName }} {{ u.lastName }}</p>
                  <p v-if="u.username" class="text-xs text-gray-400">@{{ u.username }}</p>
                </div>
                <NuxtLink v-if="u.username" :to="`/p/${u.username}`" class="text-xs text-workplace-red font-medium hover:underline" @click="showFollowersModal = showFollowingModal = false">
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
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import {
  StarIcon,
  XMarkIcon,
  PhotoIcon,
  PlusCircleIcon,
  PlayCircleIcon,
  SquaresPlusIcon,
} from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/useApi'
import Swal from 'sweetalert2'
import { useProfiles, type ProfilePost, type PostComment } from '~/composables/useProfiles'
import { useAuth } from '~/composables/useAuth'

definePageMeta({ layout: false })

const route = useRoute()
const username = computed(() => route.params.username as string)

const {
  profile, posts, postsMeta, reviews, reviewStats,
  loading, loadingPosts, loadingReviews, error,
  fetchProfile, fetchPosts, uploadMedia, uploadCover, createPost, deletePost, updatePostCaption,
  likePost, unlikePost, fetchComments, createComment, deleteComment, updateComment,
  follow, unfollow, fetchReviews, submitReview, deleteReview, updateProfileSettings,
  respondToReview, deleteReviewResponse, reportReview,
  getFollowers, getFollowing,
} = useProfiles()

const { user: currentUser, isAuthenticated, uploadAvatar } = useAuth()

// ─── Cover image ──────────────────────────────────────────────────────────────
const coverFileInput = ref<HTMLInputElement | null>(null)
const uploadingCover = ref(false)
const coverPreview = ref<string | null>(null)

const coverSrc = computed(() => {
  if (coverPreview.value) return coverPreview.value
  const { getAssetUrl } = useAssetUrl()
  return getAssetUrl(profile.value?.coverImage)
})

async function onCoverFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => { coverPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)
  uploadingCover.value = true
  try {
    await uploadCover(file)
    coverPreview.value = null
  } catch (err) {
    coverPreview.value = null
    console.error(err)
  } finally {
    uploadingCover.value = false
    if (coverFileInput.value) coverFileInput.value.value = ''
  }
}

// Layout dinámico: sin sidebar cuando no está autenticado
const layout = computed(() => isAuthenticated.value ? 'default' : 'public')

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarSrc(av: string) {
  const { getAssetUrl } = useAssetUrl()
  return getAssetUrl(av) ?? ''
}
function mediaSrc(url: string) {
  const { getAssetUrl } = useAssetUrl()
  return getAssetUrl(url) ?? ''
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

const tabs = computed(() => {
  const t: { key: string; label: string }[] = [
    { key: 'posts', label: 'Publicaciones' },
  ]
  const ps = profile.value?.profileSettings ?? { showCatalog: true, showServices: true }
  const role = profile.value?.role ?? ''
  // Catálogo: solo COMMERCE/ADMIN/SUPERADMIN con commerce
  if (ps.showCatalog && profile.value?.restaurant && ['COMMERCE', 'ADMIN', 'SUPERADMIN'].includes(role)) {
    t.push({ key: 'catalog', label: 'Catálogo' })
  }
  // Servicios: FREELANCER o COMMERCE
  if (ps.showServices && ['FREELANCER', 'COMMERCE', 'ADMIN', 'SUPERADMIN'].includes(role)) {
    t.push({ key: 'services', label: 'Servicios' })
  }
  t.push({ key: 'reviews', label: 'Reseñas' })
  return t
})

// Star breakdown
function starCount(star: number) {
  return reviews.value.filter(r => r.rating === star).length
}
function starPercent(star: number) {
  if (reviews.value.length === 0) return 0
  return Math.round((starCount(star) / reviewStats.value.reviewsCount) * 100)
}
// Devuelve el % de relleno (0–100) de la i-ésima estrella para una puntuación decimal
function starFill(i: number, rating: number): number {
  const fill = Math.min(Math.max(rating - (i - 1), 0), 1)
  return Math.round(fill * 100)
}

// ─── State ────────────────────────────────────────────────────────────────────

const activeTab = ref<'posts' | 'catalog' | 'services' | 'reviews'>('posts')
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
const reviewError = ref('')

// Avatar upload
const avatarFileInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)

// Post editing (in lightbox)
const editingCaption = ref(false)
const editCaptionValue = ref('')
const savingCaption = ref(false)

// ─── Likes / Comments ─────────────────────────────────────────────────────
const likingPostId = ref<string | null>(null)
const postComments = ref<PostComment[]>([])
const loadingComments = ref(false)
const commentInput = ref('')
const sendingComment = ref(false)
const editingCommentId = ref<string | null>(null)
const editingCommentValue = ref('')
const savingEditComment = ref(false)

// ─── Likes / Comments handlers ────────────────────────────────────────────

async function handleToggleLike(post: ProfilePost) {
  if (!isAuthenticated.value) return
  if (likingPostId.value) return
  likingPostId.value = post.id
  try {
    if (post.isLiked) {
      const res = await unlikePost(post.id)
      if (selectedPost.value?.id === post.id) {
        selectedPost.value = { ...selectedPost.value, isLiked: false, likesCount: res.likesCount }
      }
    } else {
      const res = await likePost(post.id)
      if (selectedPost.value?.id === post.id) {
        selectedPost.value = { ...selectedPost.value, isLiked: true, likesCount: res.likesCount }
      }
    }
  } finally {
    likingPostId.value = null
  }
}

async function loadComments(postId: string) {
  loadingComments.value = true
  try {
    postComments.value = await fetchComments(postId)
  } finally {
    loadingComments.value = false
  }
}

async function handleSendComment() {
  if (!selectedPost.value || !commentInput.value.trim()) return
  sendingComment.value = true
  try {
    const c = await createComment(selectedPost.value.id, commentInput.value.trim())
    postComments.value.push(c)
    commentInput.value = ''
    if (selectedPost.value) {
      selectedPost.value = { ...selectedPost.value, commentsCount: selectedPost.value.commentsCount + 1 }
    }
  } finally {
    sendingComment.value = false
  }
}

async function handleDeleteComment(comment: PostComment) {
  if (!selectedPost.value) return
  await deleteComment(selectedPost.value.id, comment.id)
  postComments.value = postComments.value.filter(c => c.id !== comment.id)
  if (selectedPost.value) {
    selectedPost.value = { ...selectedPost.value, commentsCount: Math.max(0, selectedPost.value.commentsCount - 1) }
  }
}

function startEditComment(comment: PostComment) {
  editingCommentId.value = comment.id
  editingCommentValue.value = comment.content
}

async function saveEditComment(comment: PostComment) {
  if (!editingCommentValue.value.trim()) return
  savingEditComment.value = true
  try {
    const updated = await updateComment(comment.id, editingCommentValue.value.trim())
    const idx = postComments.value.findIndex(c => c.id === comment.id)
    if (idx !== -1) postComments.value[idx] = updated
    editingCommentId.value = null
  } finally {
    savingEditComment.value = false
  }
}

// ─── Panel de configuración del perfil ─────────────────────────────────────
const showSettingsPanel = ref(false)
const settingsForm = reactive({ showCatalog: true, showServices: true })
const savingSettings = ref(false)

function openSettingsPanel() {
  settingsForm.showCatalog = profile.value?.profileSettings?.showCatalog ?? true
  settingsForm.showServices = profile.value?.profileSettings?.showServices ?? true
  showSettingsPanel.value = true
}

async function saveSettings() {
  savingSettings.value = true
  try {
    await updateProfileSettings({ showCatalog: settingsForm.showCatalog, showServices: settingsForm.showServices })
    showSettingsPanel.value = false
  } finally {
    savingSettings.value = false
  }
}

// ─── Catálogo del perfil ──────────────────────────────────────────────────
const catalogProducts = ref<any[]>([])
const catalogLoading = ref(false)
const catalogTotal = ref(0)
const catalogPage = ref(1)
const showOrderModal = ref(false)
const orderTarget = ref<any>(null)
const catalogToast = ref('')

async function fetchCatalogProducts(page = 1) {
  if (!profile.value?.restaurant?.id) return
  catalogLoading.value = true
  try {
    const res = await $fetch<{ data: any[]; total: number; totalPages: number }>(
      `${apiUrl}/catalog/products?commerceId=${profile.value.restaurant.id}&limit=12&page=${page}`,
    )
    if (page === 1) catalogProducts.value = res.data
    else catalogProducts.value.push(...res.data)
    catalogTotal.value = res.total
    catalogPage.value = page
  } finally {
    catalogLoading.value = false
  }
}

function openOrderModal(p: any) {
  orderTarget.value = p
  showOrderModal.value = true
}

function onOrderSuccess() {
  catalogToast.value = '¡Pedido enviado! El comercio te contactará pronto.'
  setTimeout(() => { catalogToast.value = '' }, 4000)
}

// ─── Servicios del perfil ─────────────────────────────────────────────────
const profileServices = ref<any[]>([])
const servicesLoading = ref(false)
const showServiceReqModal = ref(false)
const serviceReqTarget = ref<any>(null)
const serviceToast = ref('')

async function fetchProfileServices() {
  if (!profile.value?.id) return
  servicesLoading.value = true
  try {
    const res = await $fetch<{ data: any[] }>(
      `${apiUrl}/services/catalog?userId=${profile.value.id}&limit=20`,
    )
    profileServices.value = res.data
  } finally {
    servicesLoading.value = false
  }
}

function trackSvcEvent(serviceId: string, type: 'VIEW' | 'PROFILE_VISIT' | 'REQUEST') {
  const config = useRuntimeConfig()
  const base = `${(config.public.apiUrl as string)}/api/services`
  let sid = ''
  if (typeof sessionStorage !== 'undefined') {
    sid = sessionStorage.getItem('_svcSid') ?? ''
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('_svcSid', sid)
    }
  }
  const { post } = useApi()
  post('/track', { serviceId, type, sessionId: sid }).catch(() => {})
}

function openServiceReqModal(srv: any) {
  serviceReqTarget.value = srv
  showServiceReqModal.value = true
  // Trackear VIEW: el usuario abrió el formulario del servicio desde el perfil
  trackSvcEvent(srv.id, 'VIEW')
}

function onServiceReqSuccess() {
  serviceToast.value = '¡Solicitud enviada! El proveedor te contactará pronto.'
  setTimeout(() => { serviceToast.value = '' }, 4000)
  if (serviceReqTarget.value) {
    trackSvcEvent(serviceReqTarget.value.id, 'REQUEST')
  }
}

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
  postComments.value = []
  commentInput.value = ''
  editingCommentId.value = null
  loadComments(post.id)
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
    await submitReview(username.value, profile.value.id, reviewForm.value.rating, reviewForm.value.comment)
    showReviewForm.value = false
    reviewForm.value = { rating: 0, comment: '' }
    // Recargar stats del perfil (rating promedio y conteo) sin reemplazar la lista de reseñas
    if (profile.value?.username) fetchProfile(profile.value.username)
  } catch (e: any) {
    reviewError.value = e?.data?.message ?? 'No se pudo enviar la reseña'
  } finally {
    savingReview.value = false
  }
}

async function handleDeleteReview(id: string) {
  if (!confirm('¿Eliminar tu reseña?')) return
  await deleteReview(username.value, id)
  if (profile.value?.username) await fetchProfile(profile.value.username)
}

// Respuesta del negocio/freelancer a una reseña recibida
const respondingReviewId = ref<string | null>(null)
const responseDraft = ref('')
const savingResponse = ref(false)

function openResponseForm(review: { id: string; response?: string | null }) {
  respondingReviewId.value = review.id
  responseDraft.value = review.response ?? ''
}

async function handleSubmitResponse() {
  if (!respondingReviewId.value || !responseDraft.value.trim()) return
  savingResponse.value = true
  try {
    await respondToReview(respondingReviewId.value, responseDraft.value.trim())
    respondingReviewId.value = null
    responseDraft.value = ''
  } finally {
    savingResponse.value = false
  }
}

async function handleDeleteResponse(reviewId: string) {
  if (!confirm('¿Eliminar tu respuesta?')) return
  await deleteReviewResponse(reviewId)
}

// Reportar una reseña ajena por abuso
const reportingReviewId = ref<string | null>(null)
const reportReason = ref('')
const sendingReport = ref(false)

function openReportForm(reviewId: string) {
  reportingReviewId.value = reviewId
  reportReason.value = ''
}

async function handleSubmitReport() {
  if (!reportingReviewId.value || reportReason.value.trim().length < 5) return
  sendingReport.value = true
  try {
    await reportReview(reportingReviewId.value, reportReason.value.trim())
    reportingReviewId.value = null
    serviceToast.value = 'Reporte enviado. Gracias por ayudarnos a moderar.'
    setTimeout(() => { serviceToast.value = '' }, 3000)
  } finally {
    sendingReport.value = false
  }
}

// ─── Follow list modal ────────────────────────────────────────────────────────

watch(showFollowersModal, async (val) => {
  if (!val || !profile.value?.username) return
  loadingFollowList.value = true
  try {
    const res = await $fetch<{ data: typeof followList.value }>(
      `${apiUrl}/profiles/${profile.value.username}/followers`,
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
      `${apiUrl}/profiles/${profile.value.username}/following`,
      { headers: useAuth().getHeaders() },
    )
    followList.value = res.data
  } finally { loadingFollowList.value = false }
})

watch(activeTab, (tab) => {
  if (tab === 'reviews' && reviews.value.length === 0 && profile.value?.username) {
    fetchReviews(profile.value.username)
  }
  if (tab === 'catalog' && catalogProducts.value.length === 0) {
    fetchCatalogProducts(1)
  }
  if (tab === 'services' && profileServices.value.length === 0) {
    fetchProfileServices()
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
