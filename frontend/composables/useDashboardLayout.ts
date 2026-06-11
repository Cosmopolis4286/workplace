import { ref, computed } from 'vue'
import { DASHBOARD_WIDGETS, type UserRole } from '~/config/dashboard.config'

const LS_KEY = 'dashboard_layout_v1'

export interface WidgetLayoutItem {
  id: string
  visible: boolean
  order: number
}

const layout = ref<WidgetLayoutItem[]>([])

function defaultLayout(role: UserRole): WidgetLayoutItem[] {
  return DASHBOARD_WIDGETS
    .filter(w => w.roles.includes(role))
    .sort((a, b) => a.priority - b.priority)
    .map((w, i) => ({ id: w.id, visible: w.defaultVisible, order: i }))
}

function lsKey(role: UserRole) {
  return `${LS_KEY}_${role}`
}

export function useDashboardLayout() {
  const { user } = useAuth()
  const role = computed(() => user.value?.role as UserRole | undefined)

  function load() {
    if (!process.client || !role.value) return
    const raw = localStorage.getItem(lsKey(role.value))
    if (raw) {
      try {
        layout.value = JSON.parse(raw)
      } catch {
        layout.value = defaultLayout(role.value)
      }
    } else {
      layout.value = defaultLayout(role.value)
    }
  }

  function save() {
    if (!process.client || !role.value) return
    localStorage.setItem(lsKey(role.value), JSON.stringify(layout.value))
  }

  const orderedLayout = computed(() =>
    [...layout.value].sort((a, b) => a.order - b.order)
  )

  // Solo KPI widgets (los 4 superiores)
  const kpiLayout = computed(() =>
    orderedLayout.value.filter(w =>
      ['salesToday', 'activeOrders', 'lowStock', 'newCustomers'].includes(w.id)
    )
  )

  function toggleVisibility(id: string) {
    const item = layout.value.find(w => w.id === id)
    if (item) {
      item.visible = !item.visible
      save()
    }
  }

  function reorder(fromId: string, toId: string) {
    const from = layout.value.find(w => w.id === fromId)
    const to = layout.value.find(w => w.id === toId)
    if (from && to) {
      const tmp = from.order
      from.order = to.order
      to.order = tmp
      save()
    }
  }

  function reset() {
    if (role.value) {
      layout.value = defaultLayout(role.value)
      save()
    }
  }

  // Nombre legible de un widget
  function widgetName(id: string): string {
    return DASHBOARD_WIDGETS.find(w => w.id === id)?.name ?? id
  }

  return {
    layout,
    orderedLayout,
    kpiLayout,
    load,
    toggleVisibility,
    reorder,
    reset,
    widgetName,
  }
}
