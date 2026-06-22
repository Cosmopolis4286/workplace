<template>
  <div ref="rootEl" class="relative">
    <!-- Inline (desktop, hay espacio en el header) -->
    <div class="hidden md:block w-full max-w-md">
      <div class="relative">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          v-model="inputValue"
          type="text"
          placeholder="Buscar productos, servicios, empleos…"
          class="w-full pl-9 pr-8 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-workplace-red/30 transition-colors"
          :class="isDark
            ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500'
            : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'"
          @input="onInput"
          @focus="open = true"
          @keydown.down.prevent="moveHighlight(1)"
          @keydown.up.prevent="moveHighlight(-1)"
          @keydown.enter="onEnter"
          @keydown.escape="closeAndBlur"
        >
        <button
          v-if="inputValue"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          @click="clearInput"
        >
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>

      <SearchSuggestionsDropdown
        v-if="open"
        :query="inputValue"
        :suggestions="suggestions"
        :counts="counts"
        :recent-terms="recentTerms"
        :loading="loading"
        :highlighted-index="highlightedIndex"
        @select="handleSelect"
        @see-all="handleSeeAll"
        @recent-select="handleRecentSelect"
        @recent-remove="removeRecentTerm"
      />
    </div>

    <!-- Botón lupa (mobile, sin espacio en el header) -->
    <button
      class="md:hidden p-2.5 rounded-xl transition-colors"
      :class="isDark ? 'text-gray-400 hover:text-workplace-red hover:bg-white/10' : 'text-gray-400 hover:text-workplace-red hover:bg-red-50'"
      aria-label="Buscar"
      @click="overlayOpen = true"
    >
      <MagnifyingGlassIcon class="h-5 w-5" />
    </button>

    <!-- Overlay de pantalla completa (mobile) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0"
      >
        <div
          v-if="overlayOpen"
          class="fixed inset-0 z-[60] md:hidden"
          :class="isDark ? 'bg-gray-900' : 'bg-white'"
        >
          <div class="flex items-center gap-2 px-4 h-16 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <div class="relative flex-1">
              <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                ref="overlayInputEl"
                v-model="inputValue"
                type="text"
                placeholder="Buscar productos, servicios, empleos…"
                class="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-workplace-red/30"
                :class="isDark
                  ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'"
                @input="onInput"
                @keydown.down.prevent="moveHighlight(1)"
                @keydown.up.prevent="moveHighlight(-1)"
                @keydown.enter="onEnter"
                @keydown.escape="closeOverlay"
              >
            </div>
            <button
              class="p-2 rounded-xl"
              :class="isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'"
              aria-label="Cerrar búsqueda"
              @click="closeOverlay"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <div class="p-3 overflow-y-auto" style="max-height: calc(100vh - 4rem)">
            <SearchSuggestionsDropdown
              static-position
              :query="inputValue"
              :suggestions="suggestions"
              :counts="counts"
              :recent-terms="recentTerms"
              :loading="loading"
              :highlighted-index="highlightedIndex"
              @select="handleSelect"
              @see-all="handleSeeAll"
              @recent-select="handleRecentSelect"
              @recent-remove="removeRecentTerm"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useGlobalSearch } from '~/composables/useGlobalSearch'
import SearchSuggestionsDropdown from '~/components/SearchSuggestionsDropdown.vue'

const { isDark } = useColorMode()
const {
  query, suggestions, counts, recentTerms, loading, highlightedIndex,
  search, clear, moveHighlight, getHighlighted, goToSuggestion, goToTabWithQuery,
  applyRecentTerm, removeRecentTerm,
} = useGlobalSearch()

const inputValue = ref(query.value)
const open = ref(false)
const overlayOpen = ref(false)
const rootEl = ref(null)
const overlayInputEl = ref(null)

function onInput() {
  open.value = true
  search(inputValue.value)
}

function onEnter() {
  if (!inputValue.value.trim()) return
  const highlighted = getHighlighted()
  if (highlighted) {
    handleSelect(highlighted)
    return
  }
  goToTabWithQuery('productos')
  closeOverlay()
}

function handleSelect(suggestion) {
  goToSuggestion(suggestion)
  closeOverlay()
}

function handleRecentSelect(term) {
  inputValue.value = term
  applyRecentTerm(term)
}

function handleSeeAll(tab) {
  goToTabWithQuery(tab)
  closeOverlay()
}

function clearInput() {
  inputValue.value = ''
  clear()
}

function closeAndBlur() {
  open.value = false
}

function closeOverlay() {
  overlayOpen.value = false
  open.value = false
}

watch(overlayOpen, async (val) => {
  if (val) {
    await nextTick()
    overlayInputEl.value?.focus()
  }
})

function handleClickOutside(event) {
  if (rootEl.value && !rootEl.value.contains(event.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
