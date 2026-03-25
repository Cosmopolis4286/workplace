<template>
  <component
    :is="as"
    :class="buttonClasses"
    :disabled="disabled"
    @click="handleClick"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    v-bind="$attrs"
  >
    <slot />
  </component>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  as: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'ghost', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  rounded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const isPressed = ref(false)

const buttonClasses = computed(() => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'select-none',
    'touch-manipulation' // Optimización para touch
  ]

  // Size classes optimizadas para móvil
  const sizeClasses = {
    sm: ['px-3', 'py-2', 'text-sm', 'min-h-[44px]'], // Mínimo 44px para touch
    md: ['px-4', 'py-3', 'text-base', 'min-h-[48px]'], // Mínimo 48px para touch
    lg: ['px-6', 'py-4', 'text-lg', 'min-h-[52px]']  // Mínimo 52px para touch
  }

  // Variant classes
  const variantClasses = {
    primary: [
      'bg-workplace-red',
      'text-white',
      'hover:bg-red-600',
      'active:bg-red-700',
      'focus:ring-workplace-red',
      'shadow-md',
      'hover:shadow-lg',
      'active:shadow-sm'
    ],
    secondary: [
      'bg-gray-100',
      'text-gray-700',
      'hover:bg-gray-200',
      'active:bg-gray-300',
      'focus:ring-gray-500',
      'border',
      'border-gray-300'
    ],
    ghost: [
      'text-gray-600',
      'hover:bg-gray-100',
      'active:bg-gray-200',
      'focus:ring-gray-500'
    ],
    danger: [
      'bg-red-600',
      'text-white',
      'hover:bg-red-700',
      'active:bg-red-800',
      'focus:ring-red-500',
      'shadow-md'
    ]
  }

  const roundedClasses = props.rounded ? ['rounded-full'] : ['rounded-lg']

  // Touch feedback
  const touchClasses = isPressed.value 
    ? ['scale-95', 'opacity-90'] 
    : ['hover:scale-105']

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...variantClasses[props.variant],
    ...roundedClasses,
    ...touchClasses,
    {
      'opacity-50 cursor-not-allowed': props.disabled
    }
  ]
})

const handleClick = (event) => {
  if (!props.disabled) {
    emit('click', event)
  }
}

const handleTouchStart = () => {
  if (!props.disabled) {
    isPressed.value = true
  }
}

const handleTouchEnd = () => {
  if (!props.disabled) {
    isPressed.value = false
  }
}
</script>
