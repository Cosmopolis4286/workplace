<template>
  <div class="card-premium p-6">
    <div class="text-center">
      <div class="relative inline-block mb-4">
        <!-- Avatar image or initials -->
        <div class="h-32 w-32 rounded-full shadow-xl ring-4 ring-white overflow-hidden mx-auto">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            alt="Foto de perfil"
            class="h-full w-full object-cover"
          >
          <div
            v-else
            class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center"
          >
            <span class="text-4xl font-bold text-white select-none">{{ userInitials }}</span>
          </div>
        </div>

        <!-- Upload button overlay -->
        <button
          type="button"
          :disabled="uploadingAvatar"
          @click="$emit('upload-avatar')"
          class="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60"
          title="Cambiar foto"
        >
          <span v-if="uploadingAvatar" class="h-4 w-4 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
          <CameraIcon v-else class="h-4 w-4 text-gray-600" />
        </button>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ fullName }}</h2>
      <p class="text-gray-500 mb-2 text-sm">{{ user?.email }}</p>
      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" :class="roleStyle.badge">
        {{ roleStyle.label }}
      </span>
      <NuxtLink
        to="/verification"
        class="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
        :class="kycBadge.class"
      >
        <component :is="kycBadge.icon" class="h-3.5 w-3.5" />
        {{ kycBadge.label }}
      </NuxtLink>
      <div v-if="user?.username && user?.role === 'PROFESIONAL'" class="mt-3">
        <NuxtLink
          :to="`/p/${user.username}`"
          class="inline-flex items-center gap-1.5 text-sm text-workplace-red hover:underline font-medium"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          Ver perfil público
        </NuxtLink>
      </div>
      <p v-else-if="user?.role === 'PROFESIONAL'" class="mt-2 text-xs text-gray-400">
        Define un <span class="font-medium">@username</span> para activar tu perfil público
      </p>
    </div>

    <div class="mt-6 pt-6 border-t border-gray-200 space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Estado</span>
        <span class="inline-flex items-center gap-1.5 font-semibold text-green-700">
          <span class="h-2 w-2 bg-green-500 rounded-full" />
          Activo
        </span>
      </div>
      <div v-if="isCommerce" class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Comercio</span>
        <span class="font-semibold text-gray-900 truncate max-w-[120px]" :title="commerceName ?? undefined">
          {{ commerceName ?? '—' }}
        </span>
      </div>
      <div v-if="user?.phone" class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Teléfono</span>
        <span class="font-semibold text-gray-900">{{ user.phone }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CameraIcon } from '@heroicons/vue/24/outline'
import type { Component } from 'vue'
import type { User } from '~/composables/auth/useAuth'

defineProps<{
  user: User | null | undefined
  commerceName: string | null | undefined
  avatarUrl: string | null
  userInitials: string
  fullName: string
  uploadingAvatar: boolean
  isCommerce: boolean
  roleStyle: { label: string; badge: string }
  kycBadge: { label: string; icon: Component; class: string }
}>()

defineEmits<{
  'upload-avatar': []
}>()
</script>
