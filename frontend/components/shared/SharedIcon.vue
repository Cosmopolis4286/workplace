<template>
  <component :is="icon" v-bind="$attrs" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  KeyIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  UserIcon,
  PuzzlePieceIcon,
  ExclamationTriangleIcon,
  CommandLineIcon,
  BoltIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/vue/24/outline'

const iconMap: Record<string, Component> = {
  'key': KeyIcon,
  'x-mark': XMarkIcon,
  'eye': EyeIcon,
  'eye-slash': EyeSlashIcon,
  'shield-check': ShieldCheckIcon,
  'building-office': BuildingOfficeIcon,
  'user': UserIcon,
  'puzzle-piece': PuzzlePieceIcon,
  'exclamation-triangle': ExclamationTriangleIcon,
  'terminal': CommandLineIcon,
  'bolt': BoltIcon,
  'arrow-right-on-rectangle': ArrowRightOnRectangleIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
}

const props = defineProps<{ name: string }>()
const icon = computed(() => iconMap[props.name] || UserIcon)
</script>
