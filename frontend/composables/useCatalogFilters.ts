import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { CatalogCategory, CatalogCommerce, CatalogQuery } from '~/composables/useCatalog'

export interface FilterChip {
  id: string
  label: string
  onRemove: () => void
}

interface UseCatalogFiltersOptions {
  query: Ref<CatalogQuery> | ComputedRef<CatalogQuery>
  categories: Ref<readonly CatalogCategory[]> | ComputedRef<readonly CatalogCategory[]>
  commerces: Ref<readonly CatalogCommerce[]> | ComputedRef<readonly CatalogCommerce[]>
  searchInput: Ref<string>
  filterByCategory: (name: string) => void
  filterByCommerce: (id: string) => void
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
    query, categories, commerces, searchInput,
    filterByCategory, filterByCommerce, filterByPriceRange, filterByLocation, search,
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
      const commerce = commerces.value.find((c: CatalogCommerce) => c.id === q.commerceId)
      chips.push({
        id: 'commerce',
        label: commerce ? commerce.name : 'Comercio',
        onRemove: () => filterByCommerce(q.commerceId),
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
