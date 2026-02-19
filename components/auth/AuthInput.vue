<template>
  <div class="space-y-2">
    <label v-if="label" :for="id" class="block text-sm font-semibold text-gray-700">
      {{ label }}
      <span v-if="required" class="text-ifood-red ml-1">*</span>
    </label>
    
    <div class="relative group">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <component 
          :is="icon" 
          class="h-5 w-5 transition-colors duration-200"
          :class="error ? 'text-red-500' : 'text-gray-400 group-focus-within:text-ifood-red'"
        />
      </div>
      
      <input
        :id="id"
        :type="showPassword ? 'text' : type"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        :placeholder="placeholder"
        :required="required"
        class="block w-full pl-12 pr-12 py-4 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ifood-red/20 focus:border-ifood-red backdrop-blur-sm"
        :class="[
          error 
            ? 'border-red-300 bg-red-50/50 text-red-900 placeholder-red-400 focus:border-red-500 focus:ring-red-500/20' 
            : 'border-gray-300 bg-white/70 text-gray-900 placeholder-gray-500 hover:border-gray-400 focus:bg-white',
          'text-base font-medium'
        ]"
      />
      
      <div v-if="type === 'password' && showPasswordToggle" class="absolute inset-y-0 right-0 pr-4 flex items-center">
        <button
          type="button"
          @click="togglePasswordVisibility"
          class="text-gray-400 hover:text-ifood-red transition-colors duration-200 focus:outline-none focus:text-ifood-red"
        >
          <EyeIcon v-if="!showPassword" class="h-5 w-5" />
          <EyeSlashIcon v-else class="h-5 w-5" />
        </button>
      </div>
    </div>
    
    <div v-if="error || hint" class="min-h-[1.25rem]">
      <p v-if="error" class="text-sm text-red-600 font-medium flex items-center space-x-1">
        <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0" />
        <span>{{ error }}</span>
      </p>
      <p v-else-if="hint" class="text-sm text-gray-500">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  id: String,
  modelValue: String,
  type: {
    type: String,
    default: 'text'
  },
  label: String,
  placeholder: String,
  icon: [Object, Function],
  error: String,
  hint: String,
  required: Boolean,
  showPasswordToggle: Boolean
})

defineEmits(['update:modelValue'])

const showPassword = ref(false)

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}
</script>