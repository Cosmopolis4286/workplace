<template>
  <Combobox v-model="selected" :disabled="disabled" as="div" class="relative">
    <div class="relative">
      <ComboboxInput
        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300 disabled:bg-gray-50 disabled:text-gray-400"
        :class="inputClass"
        :placeholder="placeholder"
        :display-value="(item: unknown) => (item as string | null) ?? ''"
        @change="query = $event.target.value"
        @blur="query = ''"
      />
      <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronUpDownIcon class="h-4 w-4 text-gray-400" />
      </ComboboxButton>
    </div>

    <ComboboxOptions
      v-if="filteredOptions.length > 0"
      class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm"
    >
      <ComboboxOption
        v-for="option in filteredOptions"
        :key="option"
        :value="option"
        as="template"
        v-slot="{ active, selected: isSelected }"
      >
        <li
          class="cursor-pointer select-none px-4 py-2"
          :class="active ? 'bg-workplace-red/10 text-workplace-red' : 'text-gray-700'"
        >
          <span :class="isSelected ? 'font-semibold' : ''">{{ option }}</span>
        </li>
      </ComboboxOption>
    </ComboboxOptions>
  </Combobox>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue'
import { ChevronUpDownIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  modelValue: string
  options: string[]
  placeholder?: string
  disabled?: boolean
  inputClass?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const query = ref('')

const selected = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value ?? ''),
})

const filteredOptions = computed(() =>
  query.value === ''
    ? props.options
    : props.options.filter((opt) =>
        opt.toLowerCase().includes(query.value.toLowerCase())
      )
)
</script>
