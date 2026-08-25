export type SearchTabKey = 'productos' | 'servicios' | 'empleos'

export interface SearchSuggestion {
  id: string
  tab: SearchTabKey
  title: string
  subtitle?: string | null
  providerName?: string | null
  image?: string | null
  price?: number | null
  priceUnit?: string | null
  category?: { name: string; color: string | null } | null
  rating?: number | null
  reviewsCount?: number | null
  salaryMin?: number | null
  salaryMax?: number | null
  salaryCurrency?: string | null
  lowStock?: boolean
  nearYou?: boolean
}

export interface SearchTabCount {
  tab: SearchTabKey
  total: number
}

export type NeedCategory = 'comida' | 'hogar' | 'ocio'

interface SuggestCache {
  suggestions: SearchSuggestion[]
  counts: SearchTabCount[]
  detectedBudget: number | null
  needCategory: NeedCategory | null
}

const query = ref('')
const suggestions = ref<SearchSuggestion[]>([])
const counts = ref<SearchTabCount[]>([])
const detectedBudget = ref<number | null>(null)
const needCategory = ref<NeedCategory | null>(null)
const loading = ref(false)
const highlightedIndex = ref(-1)

const CACHE_MAX = 20
const cache = new Map<string, SuggestCache>()

let abortController: AbortController | null = null
let lastRequestedTerm = ''

// ─── Búsquedas recientes (header global) ──────────────────────────────────
const RECENT_KEY = 'global_search_recent'
const MAX_RECENT = 8
const recentTerms = ref<string[]>([])

function loadRecentTerms() {
  if (!process.client) return
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    recentTerms.value = stored ? JSON.parse(stored) : []
  } catch {
    recentTerms.value = []
  }
}

function persistRecentTerms() {
  if (!process.client) return
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentTerms.value))
}

function addRecentTerm(term: string) {
  const trimmed = term.trim()
  if (!trimmed) return
  recentTerms.value = [
    trimmed,
    ...recentTerms.value.filter((t: string) => t.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT)
  persistRecentTerms()
}

function removeRecentTerm(term: string) {
  recentTerms.value = recentTerms.value.filter((t: string) => t !== term)
  persistRecentTerms()
}

if (process.client) loadRecentTerms()

async function fetchSuggestions(trimmed: string) {
  abortController?.abort()
  abortController = new AbortController()
  lastRequestedTerm = trimmed

  try {
    const { get } = useApi()
    const result = await get<{
      query: string
      suggestions: SearchSuggestion[]
      counts: SearchTabCount[]
      detectedBudget: number | null
      needCategory: NeedCategory | null
    }>(
      `/search/suggest?q=${encodeURIComponent(trimmed)}`,
      { signal: abortController.signal },
    )
    // Ignora respuestas de búsquedas obsoletas que llegaron tarde
    if (trimmed !== lastRequestedTerm) return

    suggestions.value = result.suggestions
    counts.value = result.counts ?? []
    detectedBudget.value = result.detectedBudget ?? null
    needCategory.value = result.needCategory ?? null
    cache.set(trimmed.toLowerCase(), {
      suggestions: result.suggestions,
      counts: result.counts ?? [],
      detectedBudget: result.detectedBudget ?? null,
      needCategory: result.needCategory ?? null,
    })
    if (cache.size > CACHE_MAX) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) cache.delete(oldestKey)
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') return
    suggestions.value = []
    counts.value = []
    detectedBudget.value = null
    needCategory.value = null
  } finally {
    if (trimmed === lastRequestedTerm) loading.value = false
  }
}

const { debounced: debouncedFetchSuggestions, cancel: cancelSearchDebounce } = useDebounce(fetchSuggestions, 350)

export function useGlobalSearch() {
  function search(q: string) {
    query.value = q
    highlightedIndex.value = -1

    const trimmed = q.trim()
    if (trimmed.length < 2) {
      cancelSearchDebounce()
      abortController?.abort()
      suggestions.value = []
      counts.value = []
      detectedBudget.value = null
      needCategory.value = null
      loading.value = false
      return
    }

    const cached = cache.get(trimmed.toLowerCase())
    if (cached) {
      cancelSearchDebounce()
      suggestions.value = cached.suggestions
      counts.value = cached.counts
      detectedBudget.value = cached.detectedBudget
      needCategory.value = cached.needCategory
      loading.value = false
      return
    }

    loading.value = true
    debouncedFetchSuggestions(trimmed)
  }

  function clear() {
    cancelSearchDebounce()
    abortController?.abort()
    query.value = ''
    suggestions.value = []
    counts.value = []
    detectedBudget.value = null
    needCategory.value = null
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
    addRecentTerm(s.title)
    clear()
    navigateTo(`/search?tab=${s.tab}&q=${encodeURIComponent(s.title)}`)
  }

  function goToTabWithQuery(tab: SearchTabKey) {
    const q = query.value.trim()
    if (q) addRecentTerm(q)
    clear()
    navigateTo(`/search?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
  }

  function applyRecentTerm(term: string) {
    search(term)
  }

  return {
    query,
    suggestions,
    counts,
    detectedBudget,
    needCategory,
    loading,
    highlightedIndex,
    recentTerms,
    search,
    clear,
    moveHighlight,
    getHighlighted,
    goToSuggestion,
    goToTabWithQuery,
    applyRecentTerm,
    removeRecentTerm,
  }
}
