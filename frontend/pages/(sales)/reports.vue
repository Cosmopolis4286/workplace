<template>
  <div>
    <PageHeader
      title="Reportes del Negocio"
      :description="isFreelancer ? 'Resumen ejecutivo de tus solicitudes de servicio' : 'Resumen ejecutivo de ventas, gastos y equipo'"
      :icon="DocumentChartBarIcon"
      :breadcrumb="[{ label: 'Reportes' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton :icon="ArrowPathIcon" :loading="anyLoading" :disabled="anyLoading" @click="refreshAll">
          Actualizar
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="ArrowDownTrayIcon" :disabled="anyLoading || !allLoaded" @click="exportAll">
          Exportar Todo
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="globalError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ globalError }}</p>
      <button class="text-red-500 hover:text-red-700" @click="globalError = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ─── Columna principal (2/3) ─────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-6">
        <SalesReportCard
          :is-freelancer="isFreelancer"
          :loading="loadingOrders"
          :stats="orderStats"
          :format-currency="formatCurrency"
          @export="exportJSON('ventas', orderStats)"
        />

        <ExpensesReportCard
          v-if="!isFreelancer"
          :loading="loadingExpenses"
          :stats="expenseStats"
          :format-currency="formatCurrency"
          @export="exportJSON('gastos', expenseStats)"
        />
      </div>

      <!-- ─── Sidebar (1/3) ──────────────────────────────────────────────── -->
      <div class="space-y-6">
        <EmployeesReportCard
          v-if="!isFreelancer"
          :loading="loadingEmployees"
          :stats="employeeStats"
          :forbidden="employeeForbidden"
          @export="exportJSON('empleados', employeeStats)"
        />

        <FinancialHealthCard
          v-if="allLoaded && !isFreelancer"
          :net-margin="netMargin"
          :expense-ratio="expenseRatio"
          :health-emoji="healthEmoji"
          :health-color="healthColor"
          :health-message="healthMessage"
          :format-currency="formatCurrency"
        />

        <!-- Última actualización -->
        <p class="text-xs text-gray-400 text-center">
          Actualizado el {{ formatDate(new Date().toISOString()) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DocumentChartBarIcon, XMarkIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import SalesReportCard from '~/components/reports/SalesReportCard.vue'
import ExpensesReportCard from '~/components/reports/ExpensesReportCard.vue'
import EmployeesReportCard from '~/components/reports/EmployeesReportCard.vue'
import FinancialHealthCard from '~/components/reports/FinancialHealthCard.vue'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { useDataExport } from '~/composables/core/useDataExport'
import { useUserPreferences } from '~/composables/users/useUserPreferences'
import { useAuth } from '~/composables/auth/useAuth'

definePageMeta({ middleware: 'auth' })

const { formatCurrency: _fmt } = useUserPreferences()
const { get } = useApi()
const { exportJSON: downloadJSON } = useDataExport()
const { user } = useAuth()
// Un freelancer no tiene Commerce/Expense/Employee: su reporte de negocio
// se basa en ServiceRequest (solicitudes recibidas), no en Order/Expense.
// role=PROFESIONAL ya no distingue COMMERCE de FREELANCER — accountType
// (resuelto por el backend) es la fuente real.
const isFreelancer = computed(() => user.value?.accountType === 'FREELANCER')

const loadingOrders    = ref(false)
const loadingExpenses  = ref(false)
const loadingEmployees = ref(false)
const globalError      = ref<string | null>(null)

const orderStats       = ref<any>(null)
const expenseStats     = ref<any>(null)
const employeeStats    = ref<any>(null)
const employeeForbidden = ref(false)

// ─── Computados ───────────────────────────────────────────────────────────────
const anyLoading = computed(() => loadingOrders.value || loadingExpenses.value || loadingEmployees.value)
// allLoaded no requiere empleados: puede no tener permiso y las otras secciones siguen siendo válidas
const allLoaded  = computed(() => !!orderStats.value || !!expenseStats.value)

const netMargin = computed(() => {
  const income = orderStats.value?.totalRevenue ?? 0
  const expenses = expenseStats.value?.totalMonthly ?? 0
  return income - expenses
})

const expenseRatio = computed(() => {
  const income = orderStats.value?.totalRevenue ?? 0
  const expenses = expenseStats.value?.totalMonthly ?? 0
  if (!income) return 0
  return Math.round((expenses / income) * 100)
})

const healthEmoji = computed(() => {
  if (netMargin.value < 0 || expenseRatio.value > 90) return '🔴'
  if (expenseRatio.value > 70) return '🟡'
  return '🟢'
})

const healthColor = computed(() => {
  if (netMargin.value < 0 || expenseRatio.value > 90) return 'bg-red-50'
  if (expenseRatio.value > 70) return 'bg-yellow-50'
  return 'bg-green-50'
})

const healthMessage = computed(() => {
  if (netMargin.value < 0) return 'Los gastos superan los ingresos. Revisa el presupuesto.'
  if (expenseRatio.value > 90) return 'Ratio de gastos muy elevado. Considera reducir costos.'
  if (expenseRatio.value > 70) return 'Ratio de gastos moderado. Monitorea de cerca.'
  return 'Finanzas en buen estado. Sigue así.'
})

const headerStats = computed(() => {
  if (isFreelancer.value) {
    return [
      { label: 'Ingresos',    value: formatCurrency(orderStats.value?.totalRevenue) },
      { label: 'Ticket prom.', value: formatCurrency(orderStats.value?.avgTicket) },
      { label: 'Solicitudes', value: String(orderStats.value?.total ?? '—') },
      { label: 'Activas',     value: String(orderStats.value?.active ?? '—') },
    ]
  }
  return [
    { label: 'Ingresos',   value: formatCurrency(orderStats.value?.totalRevenue) },
    { label: 'Gastos mes', value: formatCurrency(expenseStats.value?.totalMonthly) },
    { label: 'Empleados',  value: String(employeeStats.value?.total ?? '—') },
    { label: 'Margen',     value: formatCurrency(netMargin.value) },
  ]
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return '—'
  return _fmt.value(value)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function exportJSON(name: string, data: any) {
  if (!data) return
  downloadJSON(`reporte-${name}`, data)
}

function exportAll() {
  if (isFreelancer.value) {
    exportJSON('completo', {
      generatedAt: new Date().toISOString(),
      solicitudes: orderStats.value,
    })
    return
  }
  exportJSON('completo', {
    generatedAt: new Date().toISOString(),
    ventas: orderStats.value,
    gastos: expenseStats.value,
    empleados: employeeStats.value,
    resumen: {
      margenNeto: netMargin.value,
      ratioGastosIngresos: `${expenseRatio.value}%`,
      saludFinanciera: healthEmoji.value === '🟢' ? 'buena' : healthEmoji.value === '🟡' ? 'moderada' : 'crítica',
    },
  })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
function isForbidden(e: any) {
  const status = e?.status ?? e?.statusCode ?? e?.response?.status
  return status === 403 || status === 401
}

async function loadOrderStats() {
  loadingOrders.value = true
  try {
    orderStats.value = await get(isFreelancer.value ? '/services/requests/stats' : '/orders/stats')
  }
  catch (e: any) {
    if (!isForbidden(e)) globalError.value = getApiErrorMessage(e, 'Error al cargar las estadísticas')
  }
  finally { loadingOrders.value = false }
}

async function loadExpenseStats() {
  loadingExpenses.value = true
  try { expenseStats.value = await get('/expenses/stats') }
  catch (e: any) {
    if (!isForbidden(e)) globalError.value = getApiErrorMessage(e, 'Error al cargar los gastos')
  }
  finally { loadingExpenses.value = false }
}

async function loadEmployeeStats() {
  loadingEmployees.value = true
  employeeForbidden.value = false
  try { employeeStats.value = await get('/employees/stats') }
  catch (e: any) {
    if (isForbidden(e)) employeeForbidden.value = true
    // error 403 no se muestra como error global
  }
  finally { loadingEmployees.value = false }
}

async function refreshAll() {
  globalError.value = null
  if (isFreelancer.value) {
    await loadOrderStats()
    return
  }
  await Promise.all([loadOrderStats(), loadExpenseStats(), loadEmployeeStats()])
}

onMounted(refreshAll)
</script>
