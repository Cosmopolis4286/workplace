<template>
  <template v-if="!collapsed">
    <button
      type="button"
      class="mt-3 mb-1 mx-1 px-1.5 py-1 rounded-md w-[calc(100%-0.5rem)] flex items-center justify-between transition-colors"
      :class="dark ? 'hover:bg-white/5' : 'hover:bg-gray-100'"
      :aria-expanded="isOpen"
      @click="toggleSection(sectionId)"
    >
      <span class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">{{ label }}</span>
      <svg
        class="h-3 w-3 transition-transform duration-150"
        :class="[isOpen ? 'rotate-180' : '', dark ? 'text-gray-500' : 'text-gray-400']"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </template>
  <template v-else>
    <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
  </template>
  <Transition
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
  >
    <div v-show="collapsed || isOpen" class="overflow-hidden">
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
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NAV_ICONS } from '~/config/sidebarNavIcons'
import type { NavItem } from '~/composables/core/useNavigation'
import { useSidebarSectionState } from '~/composables/ui/useSidebarSectionState'
import NavLink from '~/components/layout/NavLink.vue'

const props = defineProps<{
  sectionId: string
  label: string | null
  items: NavItem[]
  dark: boolean
  collapsed: boolean
  unreadServiceRequestsCount: number
  /** true cuando la ruta activa está dentro de esta sección: fuerza abierta aunque el usuario la haya colapsado */
  forceOpen?: boolean
}>()

defineEmits<{
  navigate: []
}>()

const { isCollapsed, toggleSection } = useSidebarSectionState()
const isOpen = computed(() => props.forceOpen || !isCollapsed(props.sectionId))

// Transición de altura real (no solo opacidad) sin animation-library: mide
// scrollHeight en el momento del enter/leave. v-show ya decide si el
// elemento existe en el DOM — esto solo anima esa transición.
function onEnter(el: Element) {
  const node = el as HTMLElement
  node.style.height = '0px'
  requestAnimationFrame(() => {
    node.style.height = `${node.scrollHeight}px`
  })
}
function onAfterEnter(el: Element) {
  (el as HTMLElement).style.height = ''
}
function onLeave(el: Element) {
  const node = el as HTMLElement
  node.style.height = `${node.scrollHeight}px`
  requestAnimationFrame(() => {
    node.style.height = '0px'
  })
}
</script>

<style scoped>
div.overflow-hidden {
  transition: height 150ms ease;
}
</style>
