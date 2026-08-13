<template>
  <div class="relative">
    <div class="relative">
      <!-- Input principal -->
      <div class="flex items-center border rounded-lg overflow-hidden"
        :class="[
          focused ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-300',
          disabled ? 'bg-gray-50' : 'bg-white'
        ]"
      >
        <!-- Ícono izquierdo -->
        <div class="pl-3 flex-shrink-0 text-gray-400">
          <slot name="icon">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </slot>
        </div>

        <input
          ref="inputRef"
          :value="inputText"
          :placeholder="placeholder"
          :disabled="disabled"
          type="text"
          autocomplete="off"
          class="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400"
          @input="onInput"
          @focus="focused = true"
          @blur="onBlur"
          @keydown="onKeydown"
        />

        <!-- Spinner / clear -->
        <div class="pr-2 flex items-center gap-1">
          <svg v-if="searching" class="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <button
            v-else-if="inputText && !disabled"
            type="button"
            @mousedown.prevent="clear"
            class="text-gray-300 hover:text-gray-500 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Botón geolocalización (solo en HTTPS o localhost) -->
        <button
          v-if="showGeo && geoSupported"
          type="button"
          :disabled="geoLoading || disabled"
          @mousedown.prevent="useMyLocation"
          class="pr-3 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
          title="Usar mi ubicación"
        >
          <svg v-if="!geoLoading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Dropdown de sugerencias -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <ul
        v-if="showDropdown"
        class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto"
      >
        <li
          v-for="(suggestion, i) in suggestions"
          :key="i"
          @mousedown.prevent="selectSuggestion(suggestion)"
          :class="[
            'flex items-start gap-3 px-4 py-3 cursor-pointer text-sm transition-colors',
            activeIndex === i ? 'bg-red-50' : 'hover:bg-gray-50'
          ]"
        >
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          </svg>
          <span class="text-gray-700 leading-tight">{{ suggestion.label }}</span>
        </li>

        <li v-if="suggestions.length === 0 && !searching && inputText.length >= 3"
          class="px-4 py-3 text-sm text-gray-400 text-center">
          Sin resultados para "{{ inputText }}"
        </li>
      </ul>
    </Transition>

    <!-- Error de geo -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="geoError" class="mt-1.5 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="flex-1">{{ geoError }}</span>
        <button type="button" @click="geoError = ''" class="text-red-400 hover:text-red-600 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PlaceSuggestion } from '~/composables/location/useNominatim'

const props = defineProps<{
  modelValue: PlaceSuggestion | null
  placeholder?: string
  disabled?: boolean
  showGeo?: boolean
  countrycodes?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PlaceSuggestion | null]
  'selected': [value: PlaceSuggestion]
}>()

const { searchPlaces, getCurrentLocation, isGeoAvailable } = useNominatim()
const geoSupported = isGeoAvailable()

const inputRef = ref<HTMLInputElement>()
const inputText = ref(props.modelValue?.label ?? '')
const suggestions = ref<PlaceSuggestion[]>([])
const focused = ref(false)
const searching = ref(false)
const activeIndex = ref(-1)
const geoLoading = ref(false)
const geoError = ref('')

const showDropdown = computed(() =>
  focused.value && (suggestions.value.length > 0 || (inputText.value.length >= 3 && !searching.value))
)

// Si el valor externo cambia (ej: limpiar formulario)
watch(() => props.modelValue, val => {
  if (!val) {
    inputText.value = ''
    suggestions.value = []
  } else if (val.label !== inputText.value) {
    inputText.value = val.label
  }
})

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  inputText.value = val
  activeIndex.value = -1
  // Limpiar selección previa si el usuario edita
  emit('update:modelValue', null)

  searching.value = val.length >= 3
  searchPlaces(
    val,
    results => {
      suggestions.value = results
      searching.value = false
    },
    props.countrycodes
  )
}

function onBlur() {
  // Pequeño delay para permitir clicks en el dropdown
  setTimeout(() => {
    focused.value = false
    suggestions.value = []
    // Si no hay selección válida, restaurar texto del valor actual
    if (!props.modelValue && inputText.value) {
      inputText.value = ''
    }
  }, 150)
}

function onKeydown(e: KeyboardEvent) {
  if (!showDropdown.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, suggestions.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    selectSuggestion(suggestions.value[activeIndex.value])
  } else if (e.key === 'Escape') {
    focused.value = false
    suggestions.value = []
  }
}

function selectSuggestion(s: PlaceSuggestion) {
  inputText.value = s.label
  suggestions.value = []
  emit('update:modelValue', s)
  emit('selected', s)
  inputRef.value?.blur()
}

function clear() {
  inputText.value = ''
  suggestions.value = []
  emit('update:modelValue', null)
  inputRef.value?.focus()
}

async function useMyLocation() {
  geoError.value = ''
  geoLoading.value = true
  try {
    const place = await getCurrentLocation()
    inputText.value = place.label
    emit('update:modelValue', place)
    emit('selected', place)
  } catch (e: any) {
    geoError.value = e.message
    setTimeout(() => { geoError.value = '' }, 4000)
  } finally {
    geoLoading.value = false
  }
}
</script>
