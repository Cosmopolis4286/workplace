<template>
  <div 
    :class="cardClasses"
    @click="handleClick"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- Card header -->
    <div v-if="$slots.header" class="p-4 pb-2">
      <slot name="header" />
    </div>

    <!-- Card content -->
    <div :class="contentClasses">
      <slot />
    </div>

    <!-- Card footer -->
    <div v-if="$slots.footer" class="p-4 pt-2">
      <slot name="footer" />
    </div>

    <!-- Touch indicator -->
    <div 
      v-if="isPressed && touchable"
      class="absolute inset-0 bg-black/5 rounded-xl pointer-events-none"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'elevated', 'outlined', 'ghost'].includes(value)
  },
  padding: {
    type: String,
    default: 'normal',
    validator: (value) => ['none', 'sm', 'normal', 'lg'].includes(value)
  },
  clickable: {
    type: Boolean,
    default: false
  },
  hoverable: {
    type: Boolean,
    default: true
  },
  rounded: {
    type: String,
    default: 'lg',
    validator: (value) => ['none', 'sm', 'md', 'lg', 'xl'].includes(value)
  }
})

const emit = defineEmits(['click'])

const isPressed = ref(false)
const touchable = computed(() => props.clickable || props.hoverable)

const cardClasses = computed(() => {
  const baseClasses = [
    'relative',
    'transition-all',
    'duration-200',
    'touch-manipulation'
  ]

  // Variant classes
  const variantClasses = {
    default: [
      'bg-white',
      'border',
      'border-gray-200'
    ],
    elevated: [
      'bg-white',
      'shadow-md',
      'border',
      'border-gray-100'
    ],
    outlined: [
      'bg-white',
      'border-2',
      'border-gray-300'
    ],
    ghost: [
      'bg-gray-50',
      'border',
      'border-gray-200'
    ]
  }

  // Rounded classes
  const roundedClasses = {
    none: [],
    sm: ['rounded-sm'],
    md: ['rounded-md'],
    lg: ['rounded-lg'],
    xl: ['rounded-xl']
  }

  // Interactive classes
  const interactiveClasses = []
  if (props.clickable) {
    interactiveClasses.push(
      'cursor-pointer',
      'active:scale-[0.98]',
      'active:shadow-sm'
    )
  }

  if (props.hoverable && touchable.value) {
    interactiveClasses.push(
      'hover:shadow-lg',
      'hover:border-workplace-red/20'
    )
  }

  // Touch feedback
  const touchClasses = isPressed.value && touchable.value
    ? ['scale-[0.98]', 'shadow-sm']
    : []

  return [
    ...baseClasses,
    ...variantClasses[props.variant],
    ...roundedClasses[props.rounded],
    ...interactiveClasses,
    ...touchClasses
  ]
})

const contentClasses = computed(() => {
  const paddingClasses = {
    none: [],
    sm: ['p-3'],
    normal: ['p-4'],
    lg: ['p-6']
  }

  return [
    ...paddingClasses[props.padding]
  ]
})

const handleClick = (event) => {
  if (props.clickable) {
    emit('click', event)
  }
}

const handleTouchStart = () => {
  if (touchable.value) {
    isPressed.value = true
  }
}

const handleTouchEnd = () => {
  if (touchable.value) {
    isPressed.value = false
  }
}
</script>

<style scoped>
.touch-manipulation {
  touch-action: manipulation;
}
</style>
