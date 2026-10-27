<template>
  <div>
    <PageHeader
      title="Tasas de Cambio"
      description="Gestiona las monedas y sus tasas de conversión respecto al USD"
      :icon="CurrencyDollarIcon"
      :breadcrumb="[{ label: 'Tasas de Cambio' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton v-if="canManage" variant="primary" :icon="PlusIcon" @click="openModal()">
          Nueva Moneda
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
      <div class="flex items-start gap-2">
        <ExclamationTriangleIcon class="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <p class="text-red-700 text-sm">{{ errorDisplayMessage }}</p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          v-if="errorKind === 'offline' || errorKind === 'server'"
          class="text-xs font-semibold text-red-700 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-100"
          @click="retryFetch"
        >
          Reintentar
        </button>
        <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <ExchangeRatesTable
          :rates="filtered"
          :loading="loading"
          :show-inactive="showInactive"
          :search="search"
          :preview-amount="previewAmount"
          :can-manage="canManage"
          :syncing-code="syncingCode"
          :sync-statuses="syncStatuses"
          :format-number="formatNumber"
          @update:show-inactive="onToggleShowInactive"
          @update:search="search = $event"
          @set-default="handleSetDefault"
          @toggle="handleToggle"
          @sync="handleManualSyncFromTable"
          @open-history="openHistory"
          @edit="openModal"
          @delete="handleDelete"
        />
      </div>

      <ExchangeRatesSidebar
        :preview-amount="previewAmount"
        :active-rates="activeRates"
        :format-conversion="formatConversion"
        :sync-statuses="syncStatuses"
        :can-manage="canManage"
        :syncing-all="syncingAll"
        :format-date-time="formatDateTime"
        :stats="stats"
        :format-number="formatNumber"
        @update:preview-amount="previewAmount = $event"
        @sync-all="handleSyncAll"
      />
    </div>

    <ExchangeRateFormModal
      :show="showModal"
      :editing-rate="editingRate"
      :saving="saving"
      :syncing="syncing"
      :form-error="formError"
      :form="form"
      :format-number="formatNumber"
      :format-date-time="formatDateTime"
      @close="closeModal"
      @submit="handleSubmit"
      @manual-sync="handleManualSync"
    />

    <ExchangeRateHistoryModal
      :rate="historyRate"
      :history="history"
      :loading="loadingHistory"
      :format-number="formatNumber"
      :format-date-time="formatDateTime"
      :source-label="sourceLabel"
      :source-badge-class="sourceBadgeClass"
      @close="historyRate = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { CurrencyDollarIcon, PlusIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import ExchangeRatesTable from '~/components/admin/exchange-rates/ExchangeRatesTable.vue'
import ExchangeRatesSidebar from '~/components/admin/exchange-rates/ExchangeRatesSidebar.vue'
import ExchangeRateFormModal from '~/components/admin/exchange-rates/ExchangeRateFormModal.vue'
import ExchangeRateHistoryModal from '~/components/admin/exchange-rates/ExchangeRateHistoryModal.vue'
import { useExchangeRates, type ExchangeRate, type ExchangeRateHistoryEntry, type SyncStatusEntry } from '~/composables/wallets/useExchangeRates'
import { usePermissions } from '~/composables/users/usePermissions'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { useConfirm } from '~/composables/ui/useConfirm'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const { can } = usePermissions()
const canManage = computed(() => can('exchange_rates:manage'))

const { rates, stats, loading, error, errorKind, activeRates, fetchRates, fetchStats, createRate, updateRate, setDefault, toggleStatus, deleteRate, manualSync, syncAll, getAllSyncStatuses, formatConversion, fetchHistory, fetchUsageCount } = useExchangeRates()

// Mensaje amigable por categoría de error — el mensaje crudo del backend
// (`error`) sigue disponible para debug/toasts existentes, pero el banner
// principal usa uno accionable: "sin conexión" y "servidor caído" ofrecen
// reintentar, "sin permiso" no (reintentar no cambiaría el resultado).
const errorDisplayMessage = computed(() => {
  switch (errorKind.value) {
    case 'offline': return 'No hay conexión con el servidor. Verifica tu red.'
    case 'server': return 'El servidor tuvo un problema al cargar las tasas. Intenta de nuevo en unos segundos.'
    case 'forbidden': return 'No tienes permiso para ver esta información.'
    default: return error.value ?? 'Ocurrió un error al cargar las tasas de cambio.'
  }
})

function retryFetch() {
  fetchRates(showInactive.value)
}
const { formatDateTime, formatNumber } = useDateFormat()

// ─── Filtros ──────────────────────────────────────────────────────────────────
const showInactive   = ref(true)
const search         = ref('')
const previewAmount  = ref(100)

function onToggleShowInactive(value: boolean) {
  showInactive.value = value
  fetchRates(value)
}

const filtered = computed(() => {
  let list = showInactive.value ? rates.value : rates.value.filter((r: ExchangeRate) => r.isActive)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((r: ExchangeRate) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q))
  }
  return list
})

const headerStats = computed(() => [
  { label: 'Total',        value: String(stats.value?.total  ?? '—') },
  { label: 'Activas',      value: String(stats.value?.active ?? '—') },
  { label: 'Inactivas',    value: String(stats.value?.inactive ?? '—') },
  { label: 'Predeterminada', value: stats.value?.defaultCurrency ?? '—' },
])

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal   = ref(false)
const editingRate = ref<ExchangeRate | null>(null)
const saving      = ref(false)
const formError   = ref<string | null>(null)
const formTouched = ref(false)

const form = ref({ code: '', name: '', symbol: '', rateToUsd: null as number | null, source: '', notes: '', isActive: true, isDefault: false, autoSync: false })

function openModal(rate?: ExchangeRate) {
  editingRate.value = rate ?? null; formError.value = null; formTouched.value = false
  form.value = rate
    ? { code: rate.code, name: rate.name, symbol: rate.symbol, rateToUsd: rate.rateToUsd, source: rate.source ?? '', notes: rate.notes ?? '', isActive: rate.isActive, isDefault: rate.isDefault, autoSync: rate.autoSync ?? false }
    : { code: '', name: '', symbol: '', rateToUsd: null, source: '', notes: '', isActive: true, isDefault: false, autoSync: false }
  showModal.value = true
}

function closeModal() { showModal.value = false; editingRate.value = null }

async function handleSubmit() {
  formTouched.value = true; formError.value = null
  const { rateToUsd } = form.value
  if (!form.value.code || !form.value.name || !form.value.symbol || !rateToUsd) {
    formError.value = 'Completa todos los campos requeridos.'; return
  }
  const payload = { ...form.value, rateToUsd }
  saving.value = true
  try {
    if (editingRate.value) { await updateRate(editingRate.value.id, payload); showToast('Moneda actualizada') }
    else { await createRate(payload); showToast('Moneda creada') }
    await fetchStats(); closeModal()
  } catch (e: any) { formError.value = getApiErrorMessage(e, 'No se pudo guardar la moneda') }
  finally { saving.value = false }
}

// ─── BCV Sync ─────────────────────────────────────────────────────────────────
const syncing      = ref(false)
const syncingCode  = ref<string | null>(null)
const syncingAll   = ref(false)
const syncStatuses = ref<SyncStatusEntry[]>([])

async function loadSyncStatuses() {
  try { syncStatuses.value = await getAllSyncStatuses() }
  catch { /* non-critical */ }
}

async function handleSyncAll() {
  if (syncingAll.value) return
  syncingAll.value = true
  try {
    const results = await syncAll()
    const successCount = results.filter(r => r.success).length
    showToast(`Sincronización completa: ${successCount}/${results.length} monedas actualizadas`)
    await Promise.all([fetchRates(showInactive.value), loadSyncStatuses()])
  } catch (e: any) {
    showToastError(getApiErrorMessage(e, 'Error al sincronizar todas las monedas'))
  } finally {
    syncingAll.value = false
  }
}

async function handleManualSync() {
  if (!editingRate.value) return; syncing.value = true; formError.value = null
  try {
    const res = await manualSync('VES')
    if (res.success) { showToast(`Sincronizado: 1 USD = ${res.rate} VES`); await Promise.all([fetchRates(true), loadSyncStatuses()]); editingRate.value = rates.value.find((r: ExchangeRate) => r.code === 'VES') ?? null }
    else formError.value = res.message || 'Error al sincronizar'
  } catch (e: any) { formError.value = getApiErrorMessage(e, 'Error al sincronizar') }
  finally { syncing.value = false }
}

async function handleManualSyncFromTable(rate: ExchangeRate) {
  if (syncingCode.value) return; syncingCode.value = rate.code
  try {
    const res = await manualSync(rate.code)
    if (res.success) {
      showToast(`Sincronizado: 1 USD = ${res.rate} ${rate.code}`)
      await Promise.all([fetchRates(true), loadSyncStatuses()])
    } else {
      showToastError(res.message || 'Error')
    }
  } catch (e: any) { showToastError(getApiErrorMessage(e, 'Error al sincronizar')) }
  finally { syncingCode.value = null }
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
const { confirm } = useConfirm()

async function handleDelete(rate: ExchangeRate) {
  // Consulta el impacto real antes de armar el mensaje — ninguna FK se rompe
  // al eliminar (Purchase/SupplierQuote/etc. guardan un snapshot inmutable de
  // la tasa), pero el admin debe saber si hay historial en esa moneda antes
  // de confirmar: esos registros seguirán siendo legibles, pero la moneda ya
  // no podrá elegirse para compras/cotizaciones nuevas.
  let impactMessage = `¿Eliminar ${rate.code} — ${rate.name}? Esta acción no se puede deshacer.`
  try {
    const usage = await fetchUsageCount(rate.id)
    if (usage.total > 0) {
      impactMessage = `${rate.code} — ${rate.name} tiene ${usage.total} registro(s) histórico(s) en esta moneda (compras, cotizaciones, cuentas por cobrar/pagar). `
        + `Seguirán siendo legibles, pero ya no podrás elegir ${rate.code} para operaciones nuevas tras eliminarla. Esta acción no se puede deshacer.`
    }
  } catch {
    // Best-effort: si falla la consulta de uso, se sigue con el mensaje genérico.
  }

  const ok = await confirm({
    title: 'Eliminar moneda',
    message: impactMessage,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await deleteRate(rate.id)
        await fetchStats()
      } catch (e: any) {
        return getApiErrorMessage(e, 'No se pudo eliminar la moneda')
      }
    },
  })
  if (ok) showToast('Moneda eliminada')
}

async function handleSetDefault(rate: ExchangeRate) {
  const ok = await confirm({
    title: 'Establecer como predeterminada',
    message: `¿Establecer ${rate.code} - ${rate.name} como la moneda predeterminada?`,
    confirmText: 'Establecer',
    variant: 'warning',
    onConfirm: async () => {
      try {
        await setDefault(rate.id)
        await fetchStats()
      } catch (e: any) {
        return getApiErrorMessage(e, 'No se pudo establecer la moneda predeterminada')
      }
    },
  })
  if (ok) showToast(`${rate.code} establecida como predeterminada`)
}

async function handleToggle(rate: ExchangeRate) {
  const willActivate = !rate.isActive
  const ok = await confirm({
    title: `${willActivate ? 'Activar' : 'Desactivar'} moneda`,
    message: `¿${willActivate ? 'Activar' : 'Desactivar'} ${rate.code}? ${willActivate ? 'Estará disponible para conversiones.' : 'Ya no estará disponible para conversiones.'}`,
    confirmText: willActivate ? 'Activar' : 'Desactivar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await toggleStatus(rate.id)
      } catch (e: any) {
        return getApiErrorMessage(e, 'No se pudo cambiar el estado de la moneda')
      }
    },
  })
  if (ok) showToast(`${rate.code} ${willActivate ? 'activada' : 'desactivada'}`)
}

// ─── Historial de auditoría ───────────────────────────────────────────────────
const historyRate    = ref<ExchangeRate | null>(null)
const history         = ref<ExchangeRateHistoryEntry[]>([])
const loadingHistory  = ref(false)

async function openHistory(rate: ExchangeRate) {
  historyRate.value = rate
  loadingHistory.value = true
  history.value = []
  try {
    history.value = await fetchHistory(rate.id)
  } catch (e: any) {
    showToastError(getApiErrorMessage(e, 'No se pudo cargar el historial'))
  } finally {
    loadingHistory.value = false
  }
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  CREATE: 'Creación',
  BCV_SCRAPING: 'BCV (auto)',
  API_FALLBACK: 'API (auto)',
}
function sourceLabel(source: string) { return SOURCE_LABELS[source] ?? source }
function sourceBadgeClass(source: string) {
  if (source === 'MANUAL') return 'bg-blue-100 text-blue-700'
  if (source === 'CREATE') return 'bg-gray-100 text-gray-600'
  return 'bg-green-100 text-green-700'
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const toastApi = useToast()
function showToast(msg: string) { toastApi.success(msg) }
function showToastError(msg: string) { toastApi.error(msg) }

onMounted(async () => { await Promise.all([fetchRates(true), fetchStats(), loadSyncStatuses()]) })
</script>
