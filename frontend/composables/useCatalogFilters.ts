import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { CatalogCategory, CatalogRestaurant, CatalogQuery } from '~/composables/useCatalog'

export interface FilterChip {
  id: string
  label: string
  onRemove: () => void
}

interface UseCatalogFiltersOptions {
  query: Ref<CatalogQuery> | ComputedRef<CatalogQuery>
  categories: Ref<readonly CatalogCategory[]> | ComputedRef<readonly CatalogCategory[]>
  restaurants: Ref<readonly CatalogRestaurant[]> | ComputedRef<readonly CatalogRestaurant[]>
  searchInput: Ref<string>
  filterByCategory: (name: string) => void
  filterByRestaurant: (id: string) => void
  filterByPriceRange: (min: number | null, max: number | null) => void
  filterByLocation?: (country: string, state: string, city: string) => void
  search: (term: string) => void
}

function formatChipPrice(value: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(value)
}

/**
 * Deriva los chips de filtros activos del catálogo de productos y
 * expone una función para limpiarlos individualmente.
 */
export function useCatalogFilters(options: UseCatalogFiltersOptions) {
  const {
    query, categories, restaurants, searchInput,
    filterByCategory, filterByRestaurant, filterByPriceRange, filterByLocation, search,
  } = options

  const activeChips = computed<FilterChip[]>(() => {
    const chips: FilterChip[] = []
    const q = query.value

    if (searchInput.value) {
      chips.push({
        id: 'search',
        label: `"${searchInput.value}"`,
        onRemove: () => {
          searchInput.value = ''
          search('')
        },
      })
    }

    if (q.categoryName) {
      const cat = categories.value.find((c: CatalogCategory) => c.name === q.categoryName)
      chips.push({
        id: 'category',
        label: cat ? cat.name : q.categoryName,
        onRemove: () => filterByCategory(q.categoryName),
      })
    }

    if (q.commerceId) {
      const restaurant = restaurants.value.find((r: CatalogRestaurant) => r.id === q.commerceId)
      chips.push({
        id: 'commerce',
        label: restaurant ? restaurant.name : 'Comercio',
        onRemove: () => filterByRestaurant(q.commerceId),
      })
    }

    if (q.priceMin !== null || q.priceMax !== null) {
      const label = q.priceMin !== null && q.priceMax !== null
        ? `$${formatChipPrice(q.priceMin)} - $${formatChipPrice(q.priceMax)}`
        : q.priceMin !== null
          ? `Desde $${formatChipPrice(q.priceMin)}`
          : `Hasta $${formatChipPrice(q.priceMax as number)}`

      chips.push({
        id: 'price',
        label,
        onRemove: () => filterByPriceRange(null, null),
      })
    }

    if (!q.nearMe && (q.country || q.state || q.city)) {
      const label = [q.city, q.state, q.country].filter(Boolean).join(', ')
      chips.push({
        id: 'location',
        label: `Zona: ${label}`,
        onRemove: () => filterByLocation?.('', '', ''),
      })
    }

    return chips
  })

  const hasActiveFilters = computed(() => activeChips.value.length > 0)

  return {
    activeChips,
    hasActiveFilters,
  }
}
