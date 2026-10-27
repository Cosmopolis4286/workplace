<template>
  <div
    class="flex-shrink-0 border-t"
    :class="[collapsed ? 'px-1.5 py-2' : 'px-2.5 py-2', dark ? 'border-white/10' : 'border-gray-100']"
  >
    <div class="flex items-center" :class="collapsed ? 'flex-col gap-1.5' : 'gap-1'">
      <!-- User -> /profile -->
      <NuxtLink
        to="/profile"
        class="group flex items-center rounded-lg transition-colors duration-150 min-w-0"
        :class="[
          collapsed ? 'justify-center w-10 h-10 mx-auto' : 'flex-1 gap-2.5 px-2 py-1.5',
          dark ? 'hover:bg-white/10' : 'hover:bg-gray-50',
        ]"
        :title="collapsed ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : undefined"
        @click="$emit('navigate')"
      >
        <!-- Avatar -->
        <div
          class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ring-2 transition-shadow duration-150 group-hover:ring-workplace-red/40"
          :class="dark ? 'bg-gray-700 ring-white/10' : 'bg-gray-100 ring-gray-200'"
        >
          <img v-if="user?.avatar" :src="useAssetUrl().getAssetUrl(user.avatar) ?? undefined" class="w-full h-full object-cover" />
          <svg v-else class="w-4 h-4" :class="dark ? 'text-gray-400' : 'text-gray-500'" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
          </svg>
        </div>
        <!-- Info -->
        <Transition name="fade-text">
          <div v-if="!collapsed" class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate leading-tight" :class="dark ? 'text-white group-hover:text-white' : 'text-gray-900'">
              {{ user?.firstName }} {{ user?.lastName }}
            </p>
            <p v-if="user?.username && canViewServices" class="text-xs text-workplace-red truncate leading-tight">
              @{{ user.username }}
            </p>
            <p v-else class="text-xs truncate leading-tight" :class="dark ? 'text-gray-500' : 'text-gray-400'">
              {{ user?.role }}
            </p>
          </div>
        </Transition>
      </NuxtLink>

      <!-- Logout -->
      <button
        type="button"
        class="flex-shrink-0 flex items-center justify-center rounded-lg transition-colors duration-150"
        :class="[
          collapsed ? 'w-10 h-10' : 'w-9 h-9',
          dark ? 'text-gray-400 hover:bg-red-500/15 hover:text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-600',
        ]"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        @click="$emit('logout')"
      >
        <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/composables/auth/useAuth'

defineProps<{
  user: User | null
  dark: boolean
  collapsed: boolean
  canViewServices: boolean
}>()

defineEmits<{
  navigate: []
  logout: []
}>()
</script>

<style scoped>
.fade-text-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; transition-delay: 0.04s; }
.fade-text-leave-active { transition: opacity 0.1s ease; }
.fade-text-enter-from   { opacity: 0; transform: translateX(-4px); }
.fade-text-leave-to     { opacity: 0; }
</style>
