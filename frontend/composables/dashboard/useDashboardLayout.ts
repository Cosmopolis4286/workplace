import { ref, computed } from 'vue'
import { DASHBOARD_WIDGETS, canAccessWidget, type UserRole, type AccountType } from '~/config/dashboard.config'

const LS_KEY = 'dashboard_layout_v1'

export interface WidgetLayoutItem {
  id: string
  visible: boolean
  order: number
}

const layout = ref<WidgetLayoutItem[]>([])

// Filtra también por accountTypes (canAccessWidget), no solo por role — sin
// esto, un FREELANCER (ej. profesional autónomo de categoría Comida, sin
// Commerce) recibía en su layout ids de widgets de comercio (activeOrders,
// lowStock, ordersList) porque esos widgets solo declaran roles:
// ['...PROFESIONAL'] y role=PROFESIONAL es la unión comercio∪freelancer. El
// v-if de dashboard.vue (canViewWidget) los ocultaba al renderizar, pero el
// panel "Personalizar" igual los listaba como si aplicaran.
function defaultLayout(role: UserRole, accountType: AccountType | null): WidgetLayoutItem[] {
  return DASHBOARD_WIDGETS
    .filter(w => canAccessWidget(w.id, role, accountType))
    .sort((a, b) => a.priority - b.priority)
    .map((w, i) => ({ id: w.id, visible: w.defaultVisible, order: i }))
}

// Namespaced por role + accountType: un PROFESIONAL comercio y uno
// freelancer comparten role pero no deberían compartir layout guardado
// (ids de widgets completamente distintos) — relevante en un dispositivo
// compartido (ej. demo) donde ambos tipos de cuenta inician sesión.
function lsKey(role: UserRole, accountType: AccountType | null) {
  return `${LS_KEY}_${role}${accountType ? `_${accountType}` : ''}`
}

export function useDashboardLayout() {
  const { user } = useAuth()
  const role = computed(() => user.value?.role as UserRole | undefined)
  const accountType = computed(() => user.value?.accountType ?? null)

  function load() {
    if (!process.client || !role.value) return
    const raw = localStorage.getItem(lsKey(role.value, accountType.value))
    if (raw) {
      try {
        layout.value = JSON.parse(raw)
      } catch {
        layout.value = defaultLayout(role.value, accountType.value)
      }
    } else {
      layout.value = defaultLayout(role.value, accountType.value)
    }
  }

  function save() {
    if (!process.client || !role.value) return
    localStorage.setItem(lsKey(role.value, accountType.value), JSON.stringify(layout.value))
  }

  const orderedLayout = computed(() =>
    [...layout.value].sort((a, b) => a.order - b.order)
  )

  // Solo KPI widgets (los 4 superiores)
  const kpiLayout = computed(() =>
    orderedLayout.value.filter(w =>
      ['salesToday', 'activeOrders', 'activeServiceRequests', 'lowStock', 'newCustomers'].includes(w.id)
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
      layout.value = defaultLayout(role.value, accountType.value)
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
