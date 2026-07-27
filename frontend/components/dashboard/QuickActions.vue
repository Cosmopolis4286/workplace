<template>
  <div class="bg-white rounded-2xl border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-900 tracking-tight">Acciones rápidas</h3>
      <NuxtLink
        to="/profile?tab=quick-actions"
        title="Configurar acciones rápidas"
        class="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <Cog6ToothIcon class="h-4 w-4" />
      </NuxtLink>
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
      <div
        v-for="action in orderedActions"
        :key="action.id"
        draggable="true"
        class="relative"
        :class="dragOverId === action.id ? 'z-10' : ''"
        @dragstart="onDragStart(action.id, $event)"
        @dragover.prevent="onDragOver(action.id)"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop(action.id)"
        @dragend="onDragEnd"
      >
        <NuxtLink
          :to="action.route"
          class="group flex items-center gap-2.5 py-2.5 px-3 rounded-xl border transition-all duration-150 cursor-grab active:cursor-grabbing"
          :class="dragOverId === action.id
            ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200'
            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/80'"
          :style="draggingId === action.id ? 'opacity: 0.4' : ''"
          @click="onLinkClick"
        >
          <div
            class="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-transform duration-150 group-hover:scale-105"
            :class="iconBgClasses[action.color]"
          >
            <component :is="getIcon(action.icon)" class="h-4 w-4" :class="iconColorClasses[action.color]" />
          </div>
          <span class="text-xs font-medium text-gray-700 group-hover:text-gray-900 leading-tight truncate">{{ action.name }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ShoppingCartIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  TruckIcon,
  UsersIcon,
  CogIcon,
  Cog6ToothIcon,
  UserIcon,
  WrenchIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'
import type { QuickActionConfig } from '~/config/dashboard.config'
import { useDashboardQuickActions } from '~/composables/useDashboardQuickActions'

interface Props {
  actions: QuickActionConfig[]
}

const props = defineProps<Props>()
const { setDashboardQuickActionIds } = useDashboardQuickActions()

// Orden local optimista: refleja el prop hasta que el usuario arrastra, momento
// en que se reordena de inmediato en UI y se persiste en segundo plano.
const orderedActions = ref<QuickActionConfig[]>([...props.actions])
watch(() => props.actions, (next) => { orderedActions.value = [...next] })

const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
// Evita que el click de NuxtLink dispare navegación justo al soltar el drag
let suppressClick = false

function onDragStart(id: string, e: DragEvent) {
  draggingId.value = id
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', id)
}

function onDragOver(id: string) {
  if (draggingId.value && draggingId.value !== id) dragOverId.value = id
}

function onDragLeave() {
  dragOverId.value = null
}

function onDrop(toId: string) {
  const fromId = draggingId.value
  dragOverId.value = null
  if (!fromId || fromId === toId) return

  const list = [...orderedActions.value]
  const fromIdx = list.findIndex(a => a.id === fromId)
  const toIdx = list.findIndex(a => a.id === toId)
  if (fromIdx === -1 || toIdx === -1) return

  const [moved] = list.splice(fromIdx, 1)
  list.splice(toIdx, 0, moved)
  orderedActions.value = list
  suppressClick = true

  setDashboardQuickActionIds(list.map(a => a.id)).catch(() => {})
}

function onDragEnd() {
  draggingId.value = null
  dragOverId.value = null
}

function onLinkClick(e: MouseEvent) {
  if (suppressClick) {
    e.preventDefault()
    suppressClick = false
  }
}

const iconBgClasses: Record<string, string> = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  purple: 'bg-purple-50',
  yellow: 'bg-amber-50',
  red: 'bg-red-50',
  teal: 'bg-teal-50',
  indigo: 'bg-indigo-50',
  orange: 'bg-orange-50',
}

const iconColorClasses: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  yellow: 'text-amber-600',
  red: 'text-red-600',
  teal: 'text-teal-600',
  indigo: 'text-indigo-600',
  orange: 'text-orange-600',
}

const iconMap: Record<string, any> = {
  ShoppingCartIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  TruckIcon,
  UsersIcon,
  CogIcon,
  UserIcon,
  WrenchIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
}

function getIcon(iconName: string) {
  return iconMap[iconName] || CogIcon
}
</script>
