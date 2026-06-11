<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg mr-3">
        <CogIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Acciones Rápidas</h3>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <NuxtLink
        v-for="action in actions"
        :key="action.id"
        :to="action.route"
        class="group relative overflow-hidden font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center"
        :class="gradientClasses[action.color]"
      >
        <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <component
          :is="getIcon(action.icon)"
          class="relative h-6 w-6 mx-auto mb-2 transform group-hover:scale-110 transition-transform duration-300"
        />
        <span class="relative text-sm text-white">{{ action.name }}</span>
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

const gradientClasses: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  green: 'bg-gradient-to-br from-green-500 to-green-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  yellow: 'bg-gradient-to-br from-yellow-500 to-orange-500',
  red: 'bg-gradient-to-br from-red-500 to-red-600',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-600',
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
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
