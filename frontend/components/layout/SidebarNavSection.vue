<template>
  <template v-if="!collapsed">
    <div class="mt-3 mb-1 px-2">
      <span class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">{{ label }}</span>
    </div>
  </template>
  <template v-else>
    <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
  </template>
  <NavLink
    v-for="item in items"
    :key="item.id"
    :to="item.to"
    :label="item.label"
    :dark="dark"
    :collapsed="collapsed"
    :unread-count="item.to === '/service-requests' ? unreadServiceRequestsCount : 0"
    @click="$emit('navigate')"
  >
    <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
  </NavLink>
</template>

<script setup lang="ts">
import { NAV_ICONS } from '~/config/sidebarNavIcons'
import type { NavItem } from '~/composables/core/useNavigation'
import NavLink from '~/components/layout/NavLink.vue'

defineProps<{
  label: string | null
  items: NavItem[]
  dark: boolean
  collapsed: boolean
  unreadServiceRequestsCount: number
}>()

defineEmits<{
  navigate: []
}>()
</script>
