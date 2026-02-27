<template>
  <div class="space-y-1.5">
    <label
      v-if="label"
      :for="id"
      class="block text-sm font-semibold text-gray-700"
    >
      {{ label }}
      <span v-if="required" class="text-ifood-red ml-0.5">*</span>
    </label>

    <div class="relative group">
      <!-- Left icon -->
      <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
        <component
          :is="icon"
          class="h-[18px] w-[18px] transition-colors duration-150"
          :class="iconColorClass"
        />
      </div>

      <input
        :id="id"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur')"
        @focus="$emit('focus')"
        class="block w-full pl-10 py-3 text-sm border rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 placeholder-gray-400 bg-white"
        :class="[inputStateClass, showPasswordToggle ? 'pr-10' : 'pr-4']"
      />

      <!-- Password toggle -->
      <div v-if="showPasswordToggle" class="absolute inset-y-0 right-0 pr-3.5 flex items-center z-10">
        <button
          type="button"
          tabindex="-1"
          @click="showPassword = !showPassword"
          class="text-gray-400 hover:text-gray-600 transition-colors duration-150 focus:outline-none focus:text-ifood-red rounded"
          :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        >
          <EyeSlashIcon v-if="showPassword" class="h-[18px] w-[18px]" />
          <EyeIcon v-else class="h-[18px] w-[18px]" />
        </button>
      </div>

      <!-- Valid checkmark -->
      <div v-else-if="isValid && !error" class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
        <CheckCircleIcon class="h-[18px] w-[18px] text-green-500" />
      </div>
    </div>

    <!-- Error / hint -->
    <div class="min-h-[18px]">
      <p v-if="error" class="flex items-center gap-1 text-xs text-red-600 font-medium">
        <ExclamationCircleIcon class="h-3.5 w-3.5 flex-shrink-0" />
        {{ error }}
      </p>
      <p v-else-if="hint" class="text-xs text-gray-400">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  id: String,
  modelValue: { type: String, default: '' },
  type: { type: String, default: 'text' },
  label: String,
  placeholder: String,
  icon: [Object, Function],
  error: String,
  hint: String,
  required: Boolean,
  showPasswordToggle: Boolean,
  autocomplete: String,
  inputmode: String,
  showValid: { type: Boolean, default: false }
})

defineEmits(['update:modelValue', 'blur', 'focus'])

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  return props.type
})

const isValid = computed(() =>
  props.showValid && props.modelValue && props.modelValue.length > 0 && !props.error
)

const inputStateClass = computed(() => {
  if (props.error) {
    return 'border-red-300 bg-red-50/50 text-red-900 focus:border-red-500 focus:ring-red-500/20'
  }
  if (isValid.value) {
    return 'border-green-300 bg-green-50/30 text-gray-900 focus:border-green-400 focus:ring-green-500/20'
  }
  return 'border-gray-200 text-gray-900 hover:border-gray-300 focus:border-ifood-red focus:ring-ifood-red/15'
})

const iconColorClass = computed(() => {
  if (props.error) return 'text-red-400'
  if (isValid.value) return 'text-green-500'
  return 'text-gray-400 group-focus-within:text-ifood-red'
})
</script>
