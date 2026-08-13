import { ref, computed, type Ref } from 'vue'

export interface RecentSearch { term: string; tab: string }

const STORAGE_KEY = 'search_recent'
const MAX_ITEMS = 6

export function useRecentSearches(activeTab: Ref<string>) {
  const recentSearches = ref<RecentSearch[]>([])

  function load() {
    if (!process.client) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      recentSearches.value = stored ? JSON.parse(stored) : []
    } catch {
      recentSearches.value = []
    }
  }

  function save() {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches.value))
  }

  function addRecentSearch(term: string) {
    const trimmed = term.trim()
    if (!trimmed) return
    recentSearches.value = [
      { term: trimmed, tab: activeTab.value },
      ...recentSearches.value.filter(s => s.term.toLowerCase() !== trimmed.toLowerCase() || s.tab !== activeTab.value),
    ].slice(0, MAX_ITEMS)
    save()
  }

  function removeRecentSearch(term: string, tab: string) {
    recentSearches.value = recentSearches.value.filter(s => !(s.term === term && s.tab === tab))
    save()
  }

  const recentSearchesForTab = computed(() =>
    recentSearches.value.filter(s => s.tab === activeTab.value),
  )

  if (process.client) load()

  return {
    recentSearches,
    recentSearchesForTab,
    addRecentSearch,
    removeRecentSearch,
  }
}
