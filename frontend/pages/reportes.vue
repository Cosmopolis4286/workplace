<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white px-6 py-6 shadow-lg">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold">Reportes del Negocio</h1>
          <p class="text-red-100 text-sm">Resumen ejecutivo de ventas, gastos y equipo</p>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Error banner -->
      <div v-if="globalError" class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
        <div class="flex items-center gap-3 text-red-700">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm">{{ globalError }}</span>
        </div>
        <button @click="globalError = null" class="text-red-400 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Reports grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Reporte de Ventas -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-green-100 text-sm font-medium">Reporte de Ventas</p>
                <h2 class="text-xl font-bold mt-0.5">Órdenes & Ingresos</h2>
              </div>
              <div class="p-2.5 bg-white/20 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-16H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="p-5">
            <!-- Loading -->
            <div v-if="loadingOrders" class="space-y-3 animate-pulse">
              <div class="h-5 bg-gray-200 rounded w-2/3" />
              <div class="h-5 bg-gray-200 rounded w-1/2" />
              <div class="h-5 bg-gray-200 rounded w-3/4" />
              <div class="h-5 bg-gray-200 rounded w-1/3" />
            </div>

            <div v-else-if="orderStats" class="space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Total pedidos</span>
                <span class="font-semibold text-gray-900">{{ orderStats.total?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Pedidos activos</span>
                <span class="font-semibold text-blue-600">{{ orderStats.active?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Completados hoy</span>
                <span class="font-semibold text-green-600">{{ orderStats.completedToday?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Cancelados</span>
                <span class="font-semibold text-red-600">{{ orderStats.cancelled?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2">
                <span class="text-sm text-gray-600">Ingresos totales</span>
                <span class="font-bold text-gray-900">{{ formatCurrency(orderStats.totalRevenue) }}</span>
              </div>
            </div>

            <div v-else class="py-6 text-center text-gray-400 text-sm">
              No se pudo cargar el reporte de ventas
            </div>

            <button
              :disabled="loadingOrders || !orderStats"
              class="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              @click="exportJSON('ventas', orderStats)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar JSON
            </button>
          </div>
        </div>

        <!-- Reporte de Gastos -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="bg-gradient-to-br from-orange-500 to-red-500 p-5 text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-orange-100 text-sm font-medium">Reporte de Gastos</p>
                <h2 class="text-xl font-bold mt-0.5">Costos & Presupuesto</h2>
              </div>
              <div class="p-2.5 bg-white/20 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="p-5">
            <!-- Loading -->
            <div v-if="loadingExpenses" class="space-y-3 animate-pulse">
              <div class="h-5 bg-gray-200 rounded w-2/3" />
              <div class="h-5 bg-gray-200 rounded w-1/2" />
              <div class="h-5 bg-gray-200 rounded w-3/4" />
              <div class="h-5 bg-gray-200 rounded w-1/3" />
            </div>

            <div v-else-if="expenseStats" class="space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Total mensual</span>
                <span class="font-bold text-gray-900">{{ formatCurrency(expenseStats.totalMonthly) }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Pendientes de pago</span>
                <span class="font-semibold text-yellow-600">{{ formatCurrency(expenseStats.pendingAmount) }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Pagados</span>
                <span class="font-semibold text-green-600">{{ formatCurrency(expenseStats.paidAmount) }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Presupuesto usado</span>
                <span class="font-semibold" :class="(expenseStats.budgetUsed ?? 0) > 90 ? 'text-red-600' : (expenseStats.budgetUsed ?? 0) > 70 ? 'text-yellow-600' : 'text-gray-700'">
                  {{ expenseStats.budgetUsed ?? '—' }}%
                </span>
              </div>
              <div class="flex justify-between items-center py-2">
                <span class="text-sm text-gray-600">Promedio diario</span>
                <span class="font-semibold text-gray-900">{{ formatCurrency(expenseStats.dailyAverage) }}</span>
              </div>
            </div>

            <div v-else class="py-6 text-center text-gray-400 text-sm">
              No se pudo cargar el reporte de gastos
            </div>

            <button
              :disabled="loadingExpenses || !expenseStats"
              class="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              @click="exportJSON('gastos', expenseStats)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar JSON
            </button>
          </div>
        </div>

        <!-- Reporte de Empleados -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-indigo-100 text-sm font-medium">Reporte de Empleados</p>
                <h2 class="text-xl font-bold mt-0.5">Equipo & Recursos</h2>
              </div>
              <div class="p-2.5 bg-white/20 rounded-xl">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="p-5">
            <!-- Loading -->
            <div v-if="loadingEmployees" class="space-y-3 animate-pulse">
              <div class="h-5 bg-gray-200 rounded w-2/3" />
              <div class="h-5 bg-gray-200 rounded w-1/2" />
              <div class="h-5 bg-gray-200 rounded w-3/4" />
              <div class="h-5 bg-gray-200 rounded w-1/3" />
            </div>

            <div v-else-if="employeeStats" class="space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Total empleados</span>
                <span class="font-semibold text-gray-900">{{ employeeStats.total?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Activos</span>
                <span class="font-semibold text-green-600">{{ employeeStats.active?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">Inactivos</span>
                <span class="font-semibold text-gray-500">{{ employeeStats.inactive?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-gray-600">En vacaciones</span>
                <span class="font-semibold text-yellow-600">{{ employeeStats.onVacation?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
              <div class="flex justify-between items-center py-2">
                <span class="text-sm text-gray-600">Nuevos este mes</span>
                <span class="font-semibold text-indigo-600">{{ employeeStats.newThisMonth?.toLocaleString('es-MX') ?? '—' }}</span>
              </div>
            </div>

            <div v-else class="py-6 text-center text-gray-400 text-sm">
              No se pudo cargar el reporte de empleados
            </div>

            <button
              :disabled="loadingEmployees || !employeeStats"
              class="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              @click="exportJSON('empleados', employeeStats)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar JSON
            </button>
          </div>
        </div>

      </div>

      <!-- Last updated note -->
      <p class="text-xs text-gray-400 text-center">
        Datos actualizados al {{ formatDate(new Date().toISOString()) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })

const config = useRuntimeConfig()
const { getHeaders } = useAuth()

const loadingOrders = ref(false)
const loadingExpenses = ref(false)
const loadingEmployees = ref(false)
const globalError = ref<string | null>(null)

const orderStats = ref<any>(null)
const expenseStats = ref<any>(null)
const employeeStats = ref<any>(null)

async function apiFetch(path: string) {
  const res = await fetch(`${config.public.apiUrl}${path}`, { headers: getHeaders() })
  if (!res.ok) throw new Error(`Error ${res.status} en ${path}`)
  return res.json()
}

async function loadOrderStats() {
  loadingOrders.value = true
  try {
    orderStats.value = await apiFetch('/api/orders/stats')
  } catch (e: any) {
    globalError.value = e.message
  } finally {
    loadingOrders.value = false
  }
}

async function loadExpenseStats() {
  loadingExpenses.value = true
  try {
    expenseStats.value = await apiFetch('/api/expenses/stats')
  } catch (e: any) {
    globalError.value = e.message
  } finally {
    loadingExpenses.value = false
  }
}

async function loadEmployeeStats() {
  loadingEmployees.value = true
  try {
    employeeStats.value = await apiFetch('/api/employees/stats')
  } catch (e: any) {
    globalError.value = e.message
  } finally {
    loadingEmployees.value = false
  }
}

function formatCurrency(value: number | undefined | null) {
  if (value === undefined || value === null) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function exportJSON(name: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte-${name}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  Promise.all([loadOrderStats(), loadExpenseStats(), loadEmployeeStats()])
})
</script>
