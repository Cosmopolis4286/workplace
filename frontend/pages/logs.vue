<template>
  <div>
    <PageHeader
      title="Logs del Sistema"
      description="Registro de errores, advertencias y eventos del sistema"
      :icon="ServerIcon"
    />

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div class="card-premium p-4 text-center">
        <div class="text-2xl font-bold text-gray-900">{{ logStats?.total?.toLocaleString() ?? '—' }}</div>
        <div class="text-xs text-gray-500 mt-1">Total logs</div>
      </div>
      <div
        v-for="item in logStats?.byLevel ?? []"
        :key="item.level"
        class="card-premium p-4 text-center"
      >
        <div class="text-2xl font-bold" :class="levelColor(item.level)">{{ item._count.id }}</div>
        <div class="text-xs text-gray-500 mt-1">{{ item.level }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card-premium p-4 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Buscar mensaje, contexto..."
          class="input-field text-sm"
          @input="debouncedLoad"
        >
        <select v-model="filters.level" class="input-field text-sm" @change="load">
          <option value="">Todos los niveles</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </select>
        <div class="flex gap-2">
          <input v-model="filters.dateFrom" type="date" class="input-field text-sm flex-1" @change="load">
          <input v-model="filters.dateTo" type="date" class="input-field text-sm flex-1" @change="load">
        </div>
      </div>
      <div class="flex justify-between items-center mt-3">
        <span class="text-xs text-gray-500">{{ total.toLocaleString() }} logs encontrados</span>
        <button class="text-xs text-gray-400 hover:text-gray-600" @click="resetFilters">Limpiar filtros</button>
      </div>
    </div>

    <!-- Log List -->
    <div class="space-y-2">
      <template v-if="loading">
        <div v-for="i in 10" :key="i" class="card-premium p-4 animate-pulse">
          <div class="flex gap-3">
            <div class="h-5 w-14 bg-gray-200 rounded flex-shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-3/4" />
              <div class="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </template>

      <div v-else-if="logs.length === 0" class="card-premium p-12 text-center text-gray-400">
        <ServerIcon class="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Sin logs registrados</p>
      </div>

      <div
        v-else
        v-for="log in logs"
        :key="log.id"
        class="card-premium p-4 cursor-pointer hover:border-gray-300 transition-colors"
        :class="log.level === 'ERROR' ? 'border-l-4 border-l-red-500' : log.level === 'WARN' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-gray-200'"
        @click="selectedLog = log"
      >
        <div class="flex items-start gap-3">
          <span class="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 mt-0.5" :class="levelBadge(log.level)">{{ log.level }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ log.message }}</p>
            <div class="flex gap-3 mt-1">
              <span v-if="log.context" class="text-xs text-gray-400 font-mono">{{ log.context }}</span>
              <span class="text-xs text-gray-400">{{ formatDateTime(log.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-4 flex items-center justify-between">
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

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="selectedLog" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="selectedLog = null">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div class="flex items-center gap-3">
                <span class="px-2 py-0.5 rounded text-xs font-bold" :class="levelBadge(selectedLog.level)">{{ selectedLog.level }}</span>
                <h3 class="font-bold text-gray-900">Detalle del log</h3>
              </div>
              <button @click="selectedLog = null">
                <XMarkIcon class="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div class="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-xs text-gray-400 mb-1">Fecha</p>
                  <p class="font-medium text-gray-800">{{ formatDateTime(selectedLog.createdAt) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Contexto</p>
                  <p class="font-mono text-gray-700 text-xs">{{ selectedLog.context ?? '—' }}</p>
                </div>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-1">Mensaje</p>
                <p class="text-gray-800 text-sm">{{ selectedLog.message }}</p>
              </div>
              <div v-if="selectedLog.stack">
                <p class="text-xs text-gray-400 mb-1">Stack trace</p>
                <pre class="bg-gray-950 text-green-400 rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap">{{ selectedLog.stack }}</pre>
              </div>
              <div v-if="selectedLog.meta">
                <p class="text-xs text-gray-400 mb-1">Meta</p>
                <pre class="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 overflow-x-auto">{{ JSON.stringify(selectedLog.meta, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ServerIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useApi } from '~/composables/core/useApi'

definePageMeta({ middleware: 'auth' })

// ─── State ────────────────────────────────────────────────────────────────────

const loading = ref(false)
const logs = ref<any[]>([])
const total = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const logStats = ref<any>(null)
const selectedLog = ref<any>(null)

const filters = ref({ search: '', level: '', dateFrom: '', dateTo: '' })

// ─── Load ─────────────────────────────────────────────────────────────────────

async function load(page = currentPage.value) {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '100')
    if (filters.value.search) params.set('search', filters.value.search)
    if (filters.value.level) params.set('level', filters.value.level)
    if (filters.value.dateFrom) params.set('dateFrom', filters.value.dateFrom)
    if (filters.value.dateTo) params.set('dateTo', filters.value.dateTo)

    const { get } = useApi()
    const res = await get<any>(`/audit/logs?${params}`)
    logs.value = res.data
    total.value = res.total
    totalPages.value = res.totalPages
    currentPage.value = page
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  const { get } = useApi()
  logStats.value = await get<any>('/audit/logs/stats')
}

function changePage(page: number) { load(page) }

function resetFilters() {
  filters.value = { search: '', level: '', dateFrom: '', dateTo: '' }
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

function levelBadge(level: string) {
  const map: Record<string, string> = {
    ERROR: 'bg-red-100 text-red-800',
    WARN:  'bg-amber-100 text-amber-800',
    INFO:  'bg-blue-100 text-blue-800',
    DEBUG: 'bg-gray-100 text-gray-600',
  }
  return map[level] ?? 'bg-gray-100 text-gray-600'
}

function levelColor(level: string) {
  const map: Record<string, string> = {
    ERROR: 'text-red-600',
    WARN:  'text-amber-500',
    INFO:  'text-blue-600',
    DEBUG: 'text-gray-500',
  }
  return map[level] ?? 'text-gray-600'
}
</script>

<style scoped>
.input-field {
  @apply w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
