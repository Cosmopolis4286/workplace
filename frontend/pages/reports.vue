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

        <!-- Reporte de Ventas / Solicitudes de Servicio -->
        <div class="card overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                <ShoppingCartIcon class="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 class="text-sm font-semibold text-gray-900">{{ isFreelancer ? 'Solicitudes de Servicio' : 'Ventas & Órdenes' }}</h2>
                <p class="text-xs text-gray-400">{{ isFreelancer ? 'Solicitudes recibidas e ingresos' : 'Pedidos e ingresos del negocio' }}</p>
              </div>
            </div>
            <button
              class="text-xs text-gray-400 hover:text-green-600 flex items-center gap-1 transition-colors"
              :disabled="loadingOrders"
              @click="exportJSON('ventas', orderStats)"
            >
              <ArrowDownTrayIcon class="h-3.5 w-3.5" />
              JSON
            </button>
          </div>

          <div class="p-6">
            <!-- Skeleton -->
            <div v-if="loadingOrders" class="space-y-4 animate-pulse">
              <div class="grid grid-cols-2 gap-4">
                <div v-for="n in 4" :key="n" class="h-16 bg-gray-100 rounded-xl" />
              </div>
              <div class="h-3 bg-gray-100 rounded w-full" />
              <div class="h-3 bg-gray-100 rounded w-3/4" />
            </div>

            <template v-else-if="orderStats">
              <!-- KPI grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div class="bg-gray-50 rounded-xl p-4 text-center">
                  <p class="text-2xl font-black text-gray-900">{{ orderStats.total ?? '—' }}</p>
                  <p class="text-xs text-gray-500 mt-1">{{ isFreelancer ? 'Total solicitudes' : 'Total pedidos' }}</p>
                </div>
                <div class="bg-blue-50 rounded-xl p-4 text-center">
                  <p class="text-2xl font-black text-blue-600">{{ orderStats.active ?? '—' }}</p>
                  <p class="text-xs text-gray-500 mt-1">Activos</p>
                </div>
                <div class="bg-green-50 rounded-xl p-4 text-center">
                  <p class="text-2xl font-black text-green-600">{{ orderStats.completedToday ?? '—' }}</p>
                  <p class="text-xs text-gray-500 mt-1">Completados hoy</p>
                </div>
                <div class="bg-red-50 rounded-xl p-4 text-center">
                  <p class="text-2xl font-black text-red-500">{{ orderStats.cancelled ?? '—' }}</p>
                  <p class="text-xs text-gray-500 mt-1">Cancelados</p>
                </div>
              </div>

              <!-- Ingreso destacado -->
              <div class="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div>
                  <p class="text-xs font-medium text-green-700">Ingresos totales</p>
                  <p class="text-2xl font-black text-green-800 mt-0.5">{{ formatCurrency(orderStats.totalRevenue) }}</p>
                </div>
                <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CurrencyDollarIcon class="h-6 w-6 text-green-600" />
                </div>
              </div>

              <!-- Tasa de cancelación -->
              <div class="mt-4">
                <div class="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Tasa de cancelación</span>
                  <span :class="cancellationRate > 20 ? 'text-red-600 font-semibold' : 'text-gray-600'">
                    {{ cancellationRate }}%
                  </span>
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="cancellationRate > 20 ? 'bg-red-500' : cancellationRate > 10 ? 'bg-yellow-500' : 'bg-green-500'"
                    :style="{ width: `${Math.min(cancellationRate, 100)}%` }"
                  />
                </div>
              </div>
            </template>

            <div v-else class="py-8 text-center text-gray-400 text-sm">
              No se pudieron cargar los datos de ventas
            </div>
          </div>
        </div>

        <!-- Reporte de Gastos: no aplica a un freelancer sin Commerce/Expense -->
        <div v-if="!isFreelancer" class="card overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <BanknotesIcon class="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 class="text-sm font-semibold text-gray-900">Gastos & Presupuesto</h2>
                <p class="text-xs text-gray-400">Costos y control de presupuesto</p>
              </div>
            </div>
            <button
              class="text-xs text-gray-400 hover:text-orange-600 flex items-center gap-1 transition-colors"
              :disabled="loadingExpenses"
              @click="exportJSON('gastos', expenseStats)"
            >
              <ArrowDownTrayIcon class="h-3.5 w-3.5" />
              JSON
            </button>
          </div>

          <div class="p-6">
            <!-- Skeleton -->
            <div v-if="loadingExpenses" class="space-y-4 animate-pulse">
              <div class="grid grid-cols-2 gap-4">
                <div v-for="n in 4" :key="n" class="h-16 bg-gray-100 rounded-xl" />
              </div>
              <div class="h-4 bg-gray-100 rounded w-full" />
            </div>

            <template v-else-if="expenseStats">
              <!-- KPI grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div class="bg-gray-50 rounded-xl p-4 text-center">
                  <p class="text-xl font-black text-gray-900">{{ formatCurrency(expenseStats.totalMonthly) }}</p>
                  <p class="text-xs text-gray-500 mt-1">Total mensual</p>
                </div>
                <div class="bg-yellow-50 rounded-xl p-4 text-center">
                  <p class="text-xl font-black text-yellow-600">{{ formatCurrency(expenseStats.pendingAmount) }}</p>
                  <p class="text-xs text-gray-500 mt-1">Pendientes</p>
                </div>
                <div class="bg-green-50 rounded-xl p-4 text-center">
                  <p class="text-xl font-black text-green-600">{{ formatCurrency(expenseStats.paidAmount) }}</p>
                  <p class="text-xs text-gray-500 mt-1">Pagados</p>
                </div>
              </div>

              <!-- Barra presupuesto -->
              <div class="mb-4">
                <div class="flex justify-between text-xs mb-1.5">
                  <span class="text-gray-500 font-medium">Presupuesto usado</span>
                  <span
                    class="font-bold"
                    :class="budgetUsed > 90 ? 'text-red-600' : budgetUsed > 70 ? 'text-yellow-600' : 'text-green-600'"
                  >
                    {{ budgetUsed }}%
                  </span>
                </div>
                <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'"
                    :style="{ width: `${Math.min(budgetUsed, 100)}%` }"
                  />
                </div>
                <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0%</span>
                  <span
                    class="font-medium"
                    :class="budgetUsed > 90 ? 'text-red-500' : budgetUsed > 70 ? 'text-yellow-500' : 'text-green-500'"
                  >
                    {{ budgetUsed > 90 ? '⚠️ Presupuesto crítico' : budgetUsed > 70 ? 'Presupuesto elevado' : 'Presupuesto saludable' }}
                  </span>
                  <span>100%</span>
                </div>
              </div>

              <!-- Promedio diario -->
              <div class="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                <span class="text-xs text-orange-700 font-medium">Promedio diario</span>
                <span class="text-sm font-black text-orange-800">{{ formatCurrency(expenseStats.dailyAverage) }}</span>
              </div>
            </template>

            <div v-else class="py-8 text-center text-gray-400 text-sm">
              No se pudieron cargar los datos de gastos
            </div>
          </div>
        </div>

      </div>

      <!-- ─── Sidebar (1/3) ──────────────────────────────────────────────── -->
      <div class="space-y-6">

        <!-- Reporte de Empleados: no aplica a un freelancer independiente -->
        <div v-if="!isFreelancer" class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <UsersIcon class="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 class="text-sm font-semibold text-gray-900">Equipo</h2>
                <p class="text-xs text-gray-400">Empleados & recursos</p>
              </div>
            </div>
            <button
              class="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
              :disabled="loadingEmployees"
              @click="exportJSON('empleados', employeeStats)"
            >
              <ArrowDownTrayIcon class="h-3.5 w-3.5" />
              JSON
            </button>
          </div>

          <div class="p-5">
            <!-- Skeleton -->
            <div v-if="loadingEmployees" class="space-y-3 animate-pulse">
              <div v-for="n in 5" :key="n" class="h-8 bg-gray-100 rounded-lg" />
            </div>

            <template v-else-if="employeeStats">
              <!-- Total destacado -->
              <div class="text-center py-4 mb-4 bg-indigo-50 rounded-xl">
                <p class="text-4xl font-black text-indigo-700">{{ employeeStats.total ?? '—' }}</p>
                <p class="text-xs text-indigo-500 mt-1 font-medium">empleados en total</p>
              </div>

              <!-- Lista de estados -->
              <div class="space-y-2.5">
                <div v-for="s in employeeSummary" :key="s.label" class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
                    <span class="text-sm text-gray-600">{{ s.label }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full"
                        :class="s.bar"
                        :style="{ width: employeeStats.total ? `${Math.round((s.value / employeeStats.total) * 100)}%` : '0%' }"
                      />
                    </div>
                    <span class="text-sm font-bold text-gray-900 w-5 text-right">{{ s.value ?? '—' }}</span>
                  </div>
                </div>
              </div>

              <!-- Nuevos este mes -->
              <div v-if="(employeeStats.newThisMonth ?? 0) > 0" class="mt-4 p-3 bg-indigo-50 rounded-xl flex items-center justify-between">
                <span class="text-xs text-indigo-700 font-medium">Nuevos este mes</span>
                <span class="text-sm font-black text-indigo-600">+{{ employeeStats.newThisMonth }}</span>
              </div>
            </template>

            <!-- Sin permiso -->
            <div v-else-if="employeeForbidden" class="py-6 text-center">
              <LockClosedIcon class="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p class="text-sm font-medium text-gray-500">Sin acceso</p>
              <p class="text-xs text-gray-400 mt-1">No tienes permiso para ver el reporte de empleados</p>
            </div>

            <div v-else class="py-8 text-center text-gray-400 text-sm">
              No se pudieron cargar los datos
            </div>
          </div>
        </div>

        <!-- Salud financiera: requiere expenseStats (gastos) para tener sentido, no aplica a freelancer -->
        <div v-if="allLoaded && !isFreelancer" class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <HeartIcon class="h-4 w-4 text-red-500" />
            Salud Financiera
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Margen neto</span>
              <span
                class="text-sm font-bold"
                :class="netMargin >= 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ netMargin >= 0 ? '+' : '' }}{{ formatCurrency(netMargin) }}
              </span>
            </div>
            <div class="h-px bg-gray-100" />
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Ratio gastos/ingresos</span>
              <span
                class="text-sm font-bold"
                :class="expenseRatio > 80 ? 'text-red-600' : expenseRatio > 60 ? 'text-yellow-600' : 'text-green-600'"
              >
                {{ expenseRatio }}%
              </span>
            </div>
            <div class="h-px bg-gray-100" />
            <div class="flex items-center gap-2 pt-1">
              <div
                class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                :class="healthColor"
              >
                {{ healthEmoji }}
              </div>
              <p class="text-xs text-gray-500">{{ healthMessage }}</p>
            </div>
          </div>
        </div>

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
import {
  DocumentChartBarIcon,
  XMarkIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  UsersIcon,
  CurrencyDollarIcon,
  HeartIcon,
  LockClosedIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import { useApi } from '~/composables/useApi'
import { useUserPreferences } from '~/composables/useUserPreferences'
import { useAuth } from '~/composables/useAuth'

definePageMeta({ middleware: 'auth' })

const { formatCurrency: _fmt } = useUserPreferences()
const { get } = useApi()
const { user } = useAuth()
// Un freelancer no tiene Commerce/Expense/Employee: su reporte de negocio
// se basa en ServiceRequest (solicitudes recibidas), no en Order/Expense.
const isFreelancer = computed(() => user.value?.role === 'FREELANCER')

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

const cancellationRate = computed(() => {
  const total = orderStats.value?.total ?? 0
  const cancelled = orderStats.value?.cancelled ?? 0
  if (!total) return 0
  return Math.round((cancelled / total) * 100)
})

const budgetUsed = computed(() => expenseStats.value?.budgetUsed ?? 0)

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

const employeeSummary = computed(() => [
  { label: 'Activos',        value: employeeStats.value?.active      ?? 0, dot: 'bg-green-400',  bar: 'bg-green-400'  },
  { label: 'Vacaciones',     value: employeeStats.value?.onVacation  ?? 0, dot: 'bg-yellow-400', bar: 'bg-yellow-400' },
  { label: 'Inactivos',      value: employeeStats.value?.inactive    ?? 0, dot: 'bg-gray-400',   bar: 'bg-gray-400'   },
])

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return '—'
  return _fmt.value(value)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function exportJSON(name: string, data: any) {
  if (!data) return
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte-${name}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
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
    if (!isForbidden(e)) globalError.value = e?.data?.message ?? e.message
  }
  finally { loadingOrders.value = false }
}

async function loadExpenseStats() {
  loadingExpenses.value = true
  try { expenseStats.value = await get('/expenses/stats') }
  catch (e: any) {
    if (!isForbidden(e)) globalError.value = e?.data?.message ?? e.message
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
