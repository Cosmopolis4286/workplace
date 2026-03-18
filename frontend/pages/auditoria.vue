<template>
  <div>
    <PageHeader
      title="Auditoría"
      description="Registro de todas las acciones realizadas en el sistema"
      :icon="ClipboardDocumentListIcon"
    />

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div class="card-premium p-4 text-center">
        <div class="text-2xl font-bold text-gray-900">{{ stats?.total?.toLocaleString() ?? '—' }}</div>
        <div class="text-xs text-gray-500 mt-1">Total registros</div>
      </div>
      <div v-for="item in topModules" :key="item.module" class="card-premium p-4 text-center">
        <div class="text-2xl font-bold text-workplace-red">{{ item._count.id }}</div>
        <div class="text-xs text-gray-500 mt-1 capitalize">{{ item.module }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card-premium p-4 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Buscar usuario, acción..."
          class="input-field text-sm"
          @input="debouncedLoad"
        >
        <select v-model="filters.module" class="input-field text-sm" @change="load">
          <option value="">Todos los módulos</option>
          <option v-for="m in MODULES" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="filters.action" class="input-field text-sm" @change="load">
          <option value="">Todas las acciones</option>
          <option v-for="a in ACTIONS" :key="a" :value="a">{{ a }}</option>
        </select>
        <div class="flex gap-2">
          <input v-model="filters.dateFrom" type="date" class="input-field text-sm flex-1" @change="load">
          <input v-model="filters.dateTo" type="date" class="input-field text-sm flex-1" @change="load">
        </div>
      </div>
      <div class="flex justify-between items-center mt-3">
        <span class="text-xs text-gray-500">{{ total.toLocaleString() }} registros encontrados</span>
        <button class="text-xs text-gray-400 hover:text-gray-600" @click="resetFilters">Limpiar filtros</button>
      </div>
    </div>

    <!-- Table -->
    <div class="card-premium overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resumen</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <template v-if="loading">
              <tr v-for="i in 10" :key="i" class="animate-pulse">
                <td v-for="j in 8" :key="j" class="px-4 py-3">
                  <div class="h-4 bg-gray-200 rounded w-full" />
                </td>
              </tr>
            </template>
            <template v-else-if="logs.length === 0">
              <tr>
                <td colspan="8" class="px-4 py-12 text-center text-gray-400 text-sm">Sin registros</td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 cursor-pointer" @click="selectedLog = log">
                <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{{ formatDateTime(log.createdAt) }}</td>
                <td class="px-4 py-3 text-xs font-medium text-gray-900 whitespace-nowrap">{{ log.userEmail ?? '—' }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded text-xs font-medium" :class="roleBadge(log.userRole)">{{ log.userRole ?? '—' }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded text-xs font-semibold" :class="actionBadge(log.action)">{{ log.action }}</span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-600 capitalize">{{ log.module }}</td>
                <td class="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{{ log.summary }}</td>
                <td class="px-4 py-3 text-xs text-gray-400 font-mono">{{ log.ip ?? '—' }}</td>
                <td class="px-4 py-3">
                  <span class="text-xs font-mono" :class="log.statusCode && log.statusCode >= 400 ? 'text-red-500' : 'text-green-600'">
                    {{ log.statusCode ?? '—' }}
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span class="text-xs text-gray-500">Página {{ currentPage }} de {{ totalPages }}</span>
        <div class="flex gap-2">
          <button
            :disabled="currentPage === 1"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
            @click="changePage(currentPage - 1)"
          >Anterior</button>
          <button
            :disabled="currentPage === totalPages"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
            @click="changePage(currentPage + 1)"
          >Siguiente</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="selectedLog" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="selectedLog = null">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-bold text-gray-900">Detalle del registro</h3>
              <button @click="selectedLog = null">
                <XMarkIcon class="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div class="p-5 space-y-3 text-sm overflow-y-auto max-h-[70vh]">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <p class="text-xs text-gray-400 mb-1">Fecha</p>
                  <p class="font-medium text-gray-800">{{ formatDateTime(selectedLog.createdAt) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Usuario</p>
                  <p class="font-medium text-gray-800">{{ selectedLog.userEmail ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Rol</p>
                  <span class="px-2 py-0.5 rounded text-xs font-medium" :class="roleBadge(selectedLog.userRole)">{{ selectedLog.userRole ?? '—' }}</span>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Acción</p>
                  <span class="px-2 py-0.5 rounded text-xs font-semibold" :class="actionBadge(selectedLog.action)">{{ selectedLog.action }}</span>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Módulo</p>
                  <p class="font-medium text-gray-800 capitalize">{{ selectedLog.module }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Código HTTP</p>
                  <p class="font-mono" :class="selectedLog.statusCode && selectedLog.statusCode >= 400 ? 'text-red-500' : 'text-green-600'">{{ selectedLog.statusCode ?? '—' }}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-xs text-gray-400 mb-1">IP / User-Agent</p>
                  <p class="text-gray-700 text-xs font-mono">{{ selectedLog.ip }} · {{ selectedLog.userAgent }}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-xs text-gray-400 mb-1">Resumen</p>
                  <p class="text-gray-800">{{ selectedLog.summary }}</p>
                </div>
              </div>
              <div v-if="selectedLog.details">
                <p class="text-xs text-gray-400 mb-1">Detalles</p>
                <pre class="bg-gray-50 rounded-xl p-3 text-xs overflow-x-auto text-gray-700">{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ClipboardDocumentListIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useAuth } from '~/composables/useAuth'

definePageMeta({ middleware: 'auth' })

const { getHeaders } = useAuth()
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

// ─── State ────────────────────────────────────────────────────────────────────

const loading = ref(false)
const logs = ref<any[]>([])
const total = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const stats = ref<any>(null)
const selectedLog = ref<any>(null)

const filters = ref({
  search: '',
  module: '',
  action: '',
  dateFrom: '',
  dateTo: '',
})

const MODULES = ['auth', 'usuarios', 'menu', 'inventario', 'pedidos', 'clientes', 'agendamientos', 'delivery', 'gastos', 'analytics', 'empleados', 'sucursales', 'configuracion', 'perfiles', 'permisos', 'auditoria']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'UPLOAD', 'EXPORT', 'VIEW', 'OTHER']

// ─── Computed ─────────────────────────────────────────────────────────────────

const topModules = computed(() => (stats.value?.byModule ?? []).slice(0, 3))

// ─── Load ─────────────────────────────────────────────────────────────────────

async function load(page = currentPage.value) {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '50')
    if (filters.value.search) params.set('search', filters.value.search)
    if (filters.value.module) params.set('module', filters.value.module)
    if (filters.value.action) params.set('action', filters.value.action)
    if (filters.value.dateFrom) params.set('dateFrom', filters.value.dateFrom)
    if (filters.value.dateTo) params.set('dateTo', filters.value.dateTo)

    const res = await $fetch<any>(`${apiUrl}/api/audit?${params}`, { headers: getHeaders() })
    logs.value = res.data
    total.value = res.total
    totalPages.value = res.totalPages
    currentPage.value = page
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  stats.value = await $fetch<any>(`${apiUrl}/api/audit/stats`, { headers: getHeaders() })
}

function changePage(page: number) {
  load(page)
}

function resetFilters() {
  filters.value = { search: '', module: '', action: '', dateFrom: '', dateTo: '' }
  load(1)
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedLoad() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 400)
}

onMounted(() => {
  load(1)
  loadStats()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso))
}

function roleBadge(role: string | null) {
  const map: Record<string, string> = {
    SUPERADMIN: 'bg-red-100 text-red-800',
    ADMIN: 'bg-purple-100 text-purple-800',
    COMMERCE: 'bg-blue-100 text-blue-800',
    FREELANCER: 'bg-amber-100 text-amber-800',
    NORMAL: 'bg-gray-100 text-gray-700',
  }
  return map[role ?? ''] ?? 'bg-gray-100 text-gray-600'
}

function actionBadge(action: string) {
  const map: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    LOGIN:  'bg-purple-100 text-purple-800',
    LOGOUT: 'bg-gray-100 text-gray-700',
    UPLOAD: 'bg-cyan-100 text-cyan-800',
    EXPORT: 'bg-amber-100 text-amber-800',
    VIEW:   'bg-gray-100 text-gray-600',
    OTHER:  'bg-gray-100 text-gray-500',
  }
  return map[action] ?? 'bg-gray-100 text-gray-500'
}
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
