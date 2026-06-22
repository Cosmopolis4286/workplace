export type SearchTabKey = 'productos' | 'servicios' | 'empleos'

export interface SearchSuggestion {
  id: string
  tab: SearchTabKey
  title: string
  subtitle?: string | null
  image?: string | null
  price?: number | null
  priceUnit?: string | null
  category?: { name: string; color: string | null } | null
  rating?: number | null
  salaryMin?: number | null
  salaryMax?: number | null
  salaryCurrency?: string | null
}

export interface SearchTabCount {
  tab: SearchTabKey
  total: number
}

interface SuggestCache {
  suggestions: SearchSuggestion[]
  counts: SearchTabCount[]
}

const query = ref('')
const suggestions = ref<SearchSuggestion[]>([])
const counts = ref<SearchTabCount[]>([])
const loading = ref(false)
const highlightedIndex = ref(-1)

const CACHE_MAX = 20
const cache = new Map<string, SuggestCache>()

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null
let lastRequestedTerm = ''

export function useGlobalSearch() {
  function search(q: string) {
    query.value = q
    highlightedIndex.value = -1
    if (debounceTimer) clearTimeout(debounceTimer)

    const trimmed = q.trim()
    if (trimmed.length < 2) {
      abortController?.abort()
      suggestions.value = []
      counts.value = []
      loading.value = false
      return
    }

    const cached = cache.get(trimmed.toLowerCase())
    if (cached) {
      suggestions.value = cached.suggestions
      counts.value = cached.counts
      loading.value = false
      return
    }

    loading.value = true
    debounceTimer = setTimeout(async () => {
      abortController?.abort()
      abortController = new AbortController()
      lastRequestedTerm = trimmed

      try {
        const { get } = useApi()
        const result = await get<{ query: string; suggestions: SearchSuggestion[]; counts: SearchTabCount[] }>(
          `/search/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: abortController.signal },
        )
        // Ignora respuestas de búsquedas obsoletas que llegaron tarde
        if (trimmed !== lastRequestedTerm) return

        suggestions.value = result.suggestions
        counts.value = result.counts ?? []
        cache.set(trimmed.toLowerCase(), { suggestions: result.suggestions, counts: result.counts ?? [] })
        if (cache.size > CACHE_MAX) {
          const oldestKey = cache.keys().next().value
          if (oldestKey !== undefined) cache.delete(oldestKey)
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        suggestions.value = []
        counts.value = []
      } finally {
        if (trimmed === lastRequestedTerm) loading.value = false
      }
    }, 350)
  }

  function clear() {
    if (debounceTimer) clearTimeout(debounceTimer)
    abortController?.abort()
    query.value = ''
    suggestions.value = []
    counts.value = []
    loading.value = false
    highlightedIndex.value = -1
  }

  function moveHighlight(delta: number) {
    if (suggestions.value.length === 0) return
    const max = suggestions.value.length - 1
    let next = highlightedIndex.value + delta
    if (next < -1) next = max
    if (next > max) next = -1
    highlightedIndex.value = next
  }

  function getHighlighted(): SearchSuggestion | null {
    return suggestions.value[highlightedIndex.value] ?? null
  }

  function goToSuggestion(s: SearchSuggestion) {
    clear()
    navigateTo(`/search?tab=${s.tab}&q=${encodeURIComponent(s.title)}`)
  }

  function goToTabWithQuery(tab: SearchTabKey) {
    const q = query.value.trim()
    clear()
    navigateTo(`/search?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
  }

  return {
    query,
    suggestions,
    counts,
    loading,
    highlightedIndex,
    search,
    clear,
    moveHighlight,
    getHighlighted,
    goToSuggestion,
    goToTabWithQuery,
  }
}
