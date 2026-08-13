<template>
  <div>
    <div v-if="modelValue.length" class="flex flex-wrap gap-1.5 mb-2">
      <span
        v-for="tag in modelValue"
        :key="tag"
        class="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full"
      >
        {{ tag }}
        <button type="button" @click="removeTag(tag)" class="hover:text-red-900">
          <XMarkIcon class="h-3 w-3" />
        </button>
      </span>
    </div>

    <div class="relative">
      <div class="flex gap-2">
        <input
          v-model="input"
          type="text"
          :placeholder="placeholder"
          :maxlength="maxTagLength"
          class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
          @input="onInput"
          @keydown.enter.prevent="commitOrSelectHighlighted"
          @keydown.down.prevent="moveHighlight(1)"
          @keydown.up.prevent="moveHighlight(-1)"
          @keydown.escape="closeSuggestions"
          @focus="onInput"
          @blur="onBlur"
        />
        <button
          type="button"
          @click="commitInput"
          class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
        >
          Agregar
        </button>
      </div>

      <!-- Sugerencias (tags ya usados en la plataforma, por frecuencia) -->
      <div
        v-if="showSuggestions && suggestions.length"
        class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto"
      >
        <button
          v-for="(s, i) in suggestions"
          :key="s.tag"
          type="button"
          class="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors"
          :class="i === highlightIndex ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50 text-gray-700'"
          @mousedown.prevent="selectSuggestion(s.tag)"
          @mouseenter="highlightIndex = i"
        >
          <span>{{ s.tag }}</span>
          <span class="text-[10px] text-gray-400">{{ s.count }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(defineProps<{
  modelValue: string[]
  /** Endpoint público que devuelve [{ tag, count }], filtrable con ?q= */
  suggestionsEndpoint: string
  placeholder?: string
  maxTags?: number
  maxTagLength?: number
}>(), {
  placeholder: 'Agregar etiqueta...',
  maxTags: 10,
  maxTagLength: 40,
})

const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const input = ref('')
const suggestions = ref<{ tag: string; count: number }[]>([])
const showSuggestions = ref(false)
const highlightIndex = ref(-1)

function normalize(tag: string) {
  return tag.trim().toLowerCase()
}

function commitInput() {
  addTag(input.value)
}

function addTag(raw: string) {
  const t = normalize(raw)
  if (!t) return
  if (props.modelValue.includes(t)) {
    input.value = ''
    closeSuggestions()
    return
  }
  if (props.modelValue.length >= props.maxTags) {
    closeSuggestions()
    return
  }
  emit('update:modelValue', [...props.modelValue, t])
  input.value = ''
  closeSuggestions()
}

function removeTag(tag: string) {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}

function selectSuggestion(tag: string) {
  addTag(tag)
}

function closeSuggestions() {
  showSuggestions.value = false
  highlightIndex.value = -1
}

function moveHighlight(delta: number) {
  if (!suggestions.value.length) return
  showSuggestions.value = true
  const len = suggestions.value.length
  highlightIndex.value = ((highlightIndex.value + delta) % len + len) % len
}

// Si el usuario navegó las sugerencias con flechas y da Enter, confirma la
// resaltada en vez de crear un tag nuevo con lo que haya tipeado.
function commitOrSelectHighlighted() {
  if (highlightIndex.value >= 0 && suggestions.value[highlightIndex.value]) {
    selectSuggestion(suggestions.value[highlightIndex.value].tag)
  } else {
    commitInput()
  }
}

const { debounced: onInput } = useDebounce(fetchSuggestions, 200)

function onBlur() {
  // Delay para permitir que el @mousedown.prevent de la sugerencia se procese
  // antes de cerrar la lista (blur dispara antes que click en el mismo tick).
  setTimeout(closeSuggestions, 150)
}

async function fetchSuggestions() {
  const { get } = useApi()
  try {
    const query = input.value.trim() ? `?q=${encodeURIComponent(input.value.trim())}` : ''
    const res = await get<{ data: { tag: string; count: number }[] }>(`${props.suggestionsEndpoint}${query}`)
    suggestions.value = (res.data ?? []).filter(s => !props.modelValue.includes(s.tag)).slice(0, 8)
    showSuggestions.value = suggestions.value.length > 0
    highlightIndex.value = -1
  } catch {
    suggestions.value = []
  }
}
</script>
