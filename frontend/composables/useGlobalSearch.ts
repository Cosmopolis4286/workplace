export type SearchTabKey = 'productos' | 'servicios' | 'empleos'

export interface SearchSuggestion {
  id: string
  tab: SearchTabKey
  title: string
  subtitle?: string | null
  image?: string | null
}

const query = ref('')
const suggestions = ref<SearchSuggestion[]>([])
const loading = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function useGlobalSearch() {
  function search(q: string) {
    query.value = q
    if (debounceTimer) clearTimeout(debounceTimer)

    const trimmed = q.trim()
    if (trimmed.length < 2) {
      suggestions.value = []
      loading.value = false
      return
    }

    loading.value = true
    debounceTimer = setTimeout(async () => {
      try {
        const { get } = useApi()
        const result = await get<{ query: string; suggestions: SearchSuggestion[] }>(
          `/search/suggest?q=${encodeURIComponent(trimmed)}`,
        )
        suggestions.value = result.suggestions
      } catch {
        suggestions.value = []
      } finally {
        loading.value = false
      }
    }, 350)
  }

  function clear() {
    if (debounceTimer) clearTimeout(debounceTimer)
    query.value = ''
    suggestions.value = []
    loading.value = false
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

  return { query, suggestions, loading, search, clear, goToSuggestion, goToTabWithQuery }
}
