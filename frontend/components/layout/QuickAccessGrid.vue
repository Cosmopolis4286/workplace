<template>
  <div class="px-3 pt-4 pb-3 border-b" :class="dark ? 'border-white/10' : 'border-gray-100'">
    <div class="mb-2 px-1 flex items-center justify-between">
      <p class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">Acceso rápido</p>
      <NuxtLink
        to="/profile?tab=quick-access"
        title="Configurar accesos rápidos"
        class="rounded-md p-0.5 transition-colors duration-150"
        :class="dark ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-workplace-red hover:bg-gray-100'"
        @click="$emit('navigate')"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </NuxtLink>
    </div>
    <div class="grid grid-cols-3 gap-1.5">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        @click="$emit('navigate')"
        class="group relative flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl text-white overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
        :class="item.gradient"
      >
        <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 rounded-xl" />
        <component :is="NAV_ICONS[item.icon]" class="h-5 w-5 relative" />
        <span class="text-[10px] font-semibold relative leading-none">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NAV_ICONS } from '~/config/sidebarNavIcons'
import type { QuickAccessCandidate } from '~/composables/dashboard/useQuickAccess'

defineProps<{
  items: QuickAccessCandidate[]
  dark: boolean
}>()

defineEmits<{
  navigate: []
}>()
</script>
