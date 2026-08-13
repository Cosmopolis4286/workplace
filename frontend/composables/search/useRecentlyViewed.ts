import { ref, computed, type Ref } from 'vue'

export type RecentlyViewedType = 'producto' | 'servicio' | 'empleo'

export interface RecentlyViewedItem {
  type: RecentlyViewedType
  id: string
  name: string
  image?: string | null
  subtitle?: string
  price?: number | null
}

const STORAGE_KEY = 'search_recently_viewed'
const MAX_ITEMS = 12

const TAB_TO_TYPE: Record<string, RecentlyViewedType> = {
  productos: 'producto',
  servicios: 'servicio',
  empleos: 'empleo',
}

export function useRecentlyViewed(activeTab: Ref<string>) {
  const recentlyViewed = ref<RecentlyViewedItem[]>([])

  function load() {
    if (!process.client) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      recentlyViewed.value = stored ? JSON.parse(stored) : []
    } catch {
      recentlyViewed.value = []
    }
  }

  function save() {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyViewed.value))
  }

  function addRecentlyViewed(item: RecentlyViewedItem) {
    recentlyViewed.value = [
      item,
      ...recentlyViewed.value.filter(v => !(v.type === item.type && v.id === item.id)),
    ].slice(0, MAX_ITEMS)
    save()
  }

  const recentlyViewedForTab = computed(() => {
    const tabType = TAB_TO_TYPE[activeTab.value] ?? 'producto'
    return recentlyViewed.value.filter(v => v.type === tabType)
  })

  if (process.client) load()

  return {
    recentlyViewed,
    recentlyViewedForTab,
    addRecentlyViewed,
  }
}
