/**
 * Estado de colapso por sección del sidebar (accordions), persistido en
 * localStorage — mismo patrón que useUserPreferences.ts (estado singleton +
 * lsGet/lsSet). Reduce lo que el usuario ve por defecto sin quitar
 * funcionalidad: cada sección se puede cerrar y esa preferencia se recuerda.
 */
import { ref } from 'vue'

const LS_KEY = 'sidebar_collapsed_sections'

function lsGet(): string[] {
  if (!process.client) return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function lsSet(ids: string[]) {
  if (process.client) localStorage.setItem(LS_KEY, JSON.stringify(ids))
}

const collapsedIds = ref<Set<string>>(new Set(lsGet()))

export function useSidebarSectionState() {
  function isCollapsed(sectionId: string): boolean {
    return collapsedIds.value.has(sectionId)
  }

  function toggleSection(sectionId: string) {
    const next = new Set(collapsedIds.value)
    if (next.has(sectionId)) next.delete(sectionId)
    else next.add(sectionId)
    collapsedIds.value = next
    lsSet(Array.from(next))
  }

  function expandSection(sectionId: string) {
    if (!collapsedIds.value.has(sectionId)) return
    const next = new Set(collapsedIds.value)
    next.delete(sectionId)
    collapsedIds.value = next
    lsSet(Array.from(next))
  }

  return { isCollapsed, toggleSection, expandSection }
}
