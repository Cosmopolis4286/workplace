<template>
  <NuxtLink
    :to="to"
    :class="wrapClass"
    :title="collapsed ? label : undefined"
    @click="$emit('click')"
  >
    <slot name="icon" />
    <span v-if="!collapsed" class="text-sm font-medium truncate flex-1">{{ label }}</span>
    <span
      v-if="unreadCount > 0 && collapsed"
      class="absolute top-0.5 right-0.5 min-w-[8px] h-2 w-2 rounded-full bg-workplace-red"
    />
    <span
      v-else-if="unreadCount > 0"
      class="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-workplace-red text-white text-[10px] font-bold flex items-center justify-center"
    >{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = withDefaults(defineProps<{
  to: string
  label: string
  dark?: boolean
  collapsed?: boolean
  unreadCount?: number
}>(), {
  dark: false,
  collapsed: false,
  unreadCount: 0,
})

defineEmits<{
  click: []
}>()

const route = useRoute()
const isActive = computed(() => route.path === props.to)

const wrapClass = computed(() => {
  const darkActive    = 'bg-workplace-red/15 text-workplace-red'
  const darkInactive  = 'text-gray-400 hover:bg-white/10 hover:text-white'
  const lightActive   = 'bg-red-50 text-workplace-red border-r-2 border-workplace-red'
  const lightInactive = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'

  const stateClass = isActive.value
    ? (props.dark ? darkActive   : lightActive)
    : (props.dark ? darkInactive : lightInactive)

  return props.collapsed
    ? `relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-150 ${stateClass}`
    : `flex items-center gap-3 w-full px-2.5 py-2 rounded-lg transition-all duration-150 ${stateClass}`
})
</script>
