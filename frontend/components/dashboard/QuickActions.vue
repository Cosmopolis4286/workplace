<template>
  <div class="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2.5">
        <h3 class="text-sm font-semibold text-gray-900 tracking-tight">Acciones rápidas</h3>
      </div>
      <NuxtLink
        to="/perfil?tab=acciones-rapidas"
        title="Configurar acciones rápidas"
        class="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </NuxtLink>
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
      <NuxtLink
        v-for="action in actions"
        :key="action.id"
        :to="action.route"
        class="group flex flex-col items-center gap-2.5 py-4 px-2 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/80 transition-all duration-200 text-center"
      >
        <div
          class="flex items-center justify-center w-10 h-10 rounded-full transition-transform duration-200 group-hover:scale-105"
          :class="iconBgClasses[action.color]"
        >
          <component :is="getIcon(action.icon)" class="h-5 w-5" :class="iconColorClasses[action.color]" />
        </div>
        <span class="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 leading-tight">{{ action.name }}</span>
      </NuxtLink>
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
  UserIcon,
  WrenchIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'
import type { QuickActionConfig } from '~/config/dashboard.config'

interface Props {
  actions: QuickActionConfig[]
}

defineProps<Props>()

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
  MagnifyingGlassIcon,
}

function getIcon(iconName: string) {
  return iconMap[iconName] || CogIcon
}
</script>
