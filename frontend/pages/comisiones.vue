<template>
  <div>
    <PageHeader
      title="Comisiones de Plataforma"
      description="Configura la tasa de la app sobre pedidos, solicitudes de servicio y corridas"
      :icon="BanknotesIcon"
      :breadcrumb="[{ label: 'Comisiones' }]"
    />

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ── Tasas globales ──────────────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-4">
        <div class="card overflow-hidden">
          <div class="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div class="col-span-4">Tipo de transacción</div>
            <div class="col-span-3">Tasa</div>
            <div class="col-span-4">Quién la paga</div>
            <div class="col-span-1"></div>
          </div>

          <template v-if="loading">
            <div v-for="i in 3" :key="i" class="px-5 py-4 border-b border-gray-100">
              <div class="skeleton h-5 w-full rounded" />
            </div>
          </template>

          <div v-else class="divide-y divide-gray-100">
            <div v-for="type in FEE_TYPES" :key="type" class="px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-gray-50 transition-colors">
              <div class="col-span-4">
                <span class="font-semibold text-gray-900 text-sm">{{ FEE_TYPE_LABELS[type] }}</span>
              </div>

              <template v-if="editingType === type">
                <div class="col-span-3">
                  <input v-model.number="editForm.rate" type="number" min="0" max="100" step="0.1" class="input-field py-1.5 text-sm" />
                </div>
                <div class="col-span-4">
                  <select v-model="editForm.payer" class="input-field py-1.5 text-sm">
                    <option value="CLIENT">{{ FEE_PAYER_LABELS.CLIENT }}</option>
                    <option value="PROVIDER">{{ FEE_PAYER_LABELS.PROVIDER }}</option>
                  </select>
                </div>
                <div class="col-span-1 flex items-center justify-end gap-1">
                  <button class="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600" :disabled="saving" @click="confirmEdit(type)">
                    <CheckIcon class="h-4 w-4" />
                  </button>
                  <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="editingType = null">
                    <XMarkIcon class="h-4 w-4" />
                  </button>
                </div>
              </template>

              <template v-else>
                <div class="col-span-3">
                  <span v-if="rateFor(type)" class="font-mono font-semibold text-gray-900 text-sm">{{ rateFor(type)!.rate }}%</span>
                  <span v-else class="text-xs text-gray-400">Sin configurar</span>
                </div>
                <div class="col-span-4">
                  <span v-if="rateFor(type)" class="badge" :class="rateFor(type)!.payer === 'CLIENT' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'">
                    {{ FEE_PAYER_LABELS[rateFor(type)!.payer] }}
                  </span>
                  <span v-else class="text-xs text-gray-400">No se cobra comisión</span>
                </div>
                <div class="col-span-1 flex justify-end">
                  <button class="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Editar" @click="openEdit(type)">
                    <PencilIcon class="h-3.5 w-3.5" />
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- ── Overrides ──────────────────────────────────────────────────── -->
        <div class="card">
          <div class="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-gray-900">Excepciones</h3>
              <p class="text-xs text-gray-400 mt-0.5">Tasas distintas para un plan o usuario específico</p>
            </div>
            <button class="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5" @click="openCreateOverride">
              <PlusIcon class="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>

          <div v-if="overrides.length === 0" class="p-8 text-center">
            <UsersIcon class="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p class="text-sm text-gray-400">Sin excepciones configuradas.</p>
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div v-for="ov in overrides" :key="ov.id" class="px-5 py-3.5 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">
                  {{ FEE_TYPE_LABELS[ov.type] }} — {{ ov.rate }}%
                </p>
                <p class="text-xs text-gray-400 truncate">
                  <span v-if="ov.user">Usuario: {{ ov.user.firstName }} {{ ov.user.lastName }} ({{ ov.user.email }})</span>
                  <span v-else-if="ov.plan">Plan: {{ ov.plan.name }}</span>
                  <span v-if="ov.payer"> · {{ FEE_PAYER_LABELS[ov.payer] }}</span>
                </p>
              </div>
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0" title="Eliminar" @click="handleDeleteOverride(ov)">
                <TrashIcon class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sidebar info ────────────────────────────────────────────────── -->
      <div class="space-y-4">
        <div class="card p-5 border-l-4 border-l-blue-400">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Cómo funciona</h3>
          <ul class="space-y-2.5 text-xs text-gray-500 leading-snug">
            <li><strong class="text-gray-700">Cliente:</strong> la tasa se suma al precio final que ve y paga el cliente.</li>
            <li><strong class="text-gray-700">Proveedor:</strong> la tasa se descuenta automáticamente de la billetera del comercio/proveedor/conductor cuando la transacción se completa.</li>
            <li><strong class="text-gray-700">Excepciones:</strong> tienen prioridad sobre la tasa global — primero por usuario, luego por plan.</li>
            <li>Si un tipo de transacción no tiene tasa configurada, no se cobra ninguna comisión.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- ── Modal crear override ────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showOverrideModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showOverrideModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showOverrideModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-base font-bold text-gray-900">Nueva excepción</h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="showOverrideModal = false"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <form class="p-6 space-y-4" @submit.prevent="handleCreateOverride">
              <div v-if="overrideFormError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{{ overrideFormError }}</div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de transacción <span class="text-red-500">*</span></label>
                <select v-model="overrideForm.type" required class="input-field">
                  <option v-for="t in FEE_TYPES" :key="t" :value="t">{{ FEE_TYPE_LABELS[t] }}</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tasa (%) <span class="text-red-500">*</span></label>
                <input v-model.number="overrideForm.rate" type="number" required min="0" max="100" step="0.1" class="input-field" />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Quién paga (opcional)</label>
                <select v-model="overrideForm.payer" class="input-field">
                  <option :value="undefined">Hereda de la tasa global</option>
                  <option value="CLIENT">{{ FEE_PAYER_LABELS.CLIENT }}</option>
                  <option value="PROVIDER">{{ FEE_PAYER_LABELS.PROVIDER }}</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-1 bg-gray-100 rounded-xl p-1">
                <button type="button" class="py-1.5 rounded-lg text-xs font-semibold transition-colors" :class="overrideTarget === 'user' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'" @click="overrideTarget = 'user'">Por usuario</button>
                <button type="button" class="py-1.5 rounded-lg text-xs font-semibold transition-colors" :class="overrideTarget === 'plan' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'" @click="overrideTarget = 'plan'">Por plan</button>
              </div>

              <div v-if="overrideTarget === 'user'" class="relative">
                <label class="block text-xs font-medium text-gray-700 mb-1">Usuario <span class="text-red-500">*</span></label>
                <div v-if="selectedUser" class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ selectedUser.firstName }} {{ selectedUser.lastName }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ selectedUser.email }}</p>
                  </div>
                  <button type="button" class="p-1 rounded-lg hover:bg-gray-200 text-gray-400 flex-shrink-0" @click="clearSelectedUser">
                    <XMarkIcon class="h-4 w-4" />
                  </button>
                </div>
                <template v-else>
                  <input
                    v-model="userSearch"
                    type="text"
                    placeholder="Buscar por nombre o correo..."
                    class="input-field"
                    @input="onUserSearchInput"
                  />
                  <div v-if="userSearchResults.length > 0" class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    <button
                      v-for="u in userSearchResults" :key="u.id"
                      type="button"
                      class="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2"
                      @click="selectUser(u)"
                    >
                      <span class="text-sm text-gray-900 truncate">{{ u.firstName }} {{ u.lastName }}</span>
                      <span class="text-xs text-gray-400 truncate">{{ u.email }}</span>
                    </button>
                  </div>
                  <p v-else-if="searchingUsers" class="text-xs text-gray-400 mt-1">Buscando…</p>
                </template>
              </div>
              <div v-else>
                <label class="block text-xs font-medium text-gray-700 mb-1">ID de plan <span class="text-red-500">*</span></label>
                <input v-model="overrideForm.planId" type="text" placeholder="UUID del plan" class="input-field" />
              </div>

              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="showOverrideModal = false">Cancelar</button>
                <button type="submit" :disabled="savingOverride" class="btn-primary flex-1">
                  {{ savingOverride ? 'Guardando...' : 'Crear' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="toast" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm">
          <CheckCircleIcon class="h-4 w-4 text-green-400 flex-shrink-0" />
          {{ toast }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  BanknotesIcon, XMarkIcon, PencilIcon, CheckIcon, PlusIcon, TrashIcon,
  UsersIcon, CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import {
  usePlatformFees,
  FEE_TYPE_LABELS, FEE_PAYER_LABELS,
  type FeeTransactionType, type FeePayer, type PlatformFeeRate, type PlatformFeeOverride, type UserSearchResult,
} from '~/composables/usePlatformFees'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const FEE_TYPES: FeeTransactionType[] = ['ORDER', 'SERVICE_REQUEST', 'CORRIDA']

const { fetchRates, upsertRate, fetchOverrides, createOverride, deleteOverride, searchUsers } = usePlatformFees()

const rates = ref<PlatformFeeRate[]>([])
const overrides = ref<PlatformFeeOverride[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

function rateFor(type: FeeTransactionType) {
  return rates.value.find(r => r.type === type) ?? null
}

// ─── Edición inline de tasa global ─────────────────────────────────────────
const editingType = ref<FeeTransactionType | null>(null)
const editForm = ref<{ rate: number; payer: FeePayer }>({ rate: 0, payer: 'CLIENT' })
const saving = ref(false)

function openEdit(type: FeeTransactionType) {
  const existing = rateFor(type)
  editForm.value = { rate: existing?.rate ?? 0, payer: existing?.payer ?? 'CLIENT' }
  editingType.value = type
}

async function confirmEdit(type: FeeTransactionType) {
  saving.value = true
  try {
    const updated = await upsertRate(type, editForm.value.rate, editForm.value.payer)
    const idx = rates.value.findIndex(r => r.type === type)
    if (idx !== -1) rates.value[idx] = updated
    else rates.value.push(updated)
    editingType.value = null
    showToast('Tasa actualizada')
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

// ─── Overrides ──────────────────────────────────────────────────────────────
const showOverrideModal = ref(false)
const overrideTarget = ref<'user' | 'plan'>('user')
const overrideForm = ref<{ type: FeeTransactionType; rate: number; payer?: FeePayer; userId?: string; planId?: string }>({
  type: 'ORDER', rate: 0,
})
const overrideFormError = ref<string | null>(null)
const savingOverride = ref(false)

const selectedUser = ref<UserSearchResult | null>(null)
const userSearch = ref('')
const userSearchResults = ref<UserSearchResult[]>([])
const searchingUsers = ref(false)
let userSearchTimer: ReturnType<typeof setTimeout>

function onUserSearchInput() {
  clearTimeout(userSearchTimer)
  if (!userSearch.value.trim()) {
    userSearchResults.value = []
    return
  }
  searchingUsers.value = true
  userSearchTimer = setTimeout(async () => {
    try {
      userSearchResults.value = await searchUsers(userSearch.value)
    } catch {
      userSearchResults.value = []
    } finally {
      searchingUsers.value = false
    }
  }, 350)
}

function selectUser(u: UserSearchResult) {
  selectedUser.value = u
  overrideForm.value.userId = u.id
  userSearchResults.value = []
  userSearch.value = ''
}

function clearSelectedUser() {
  selectedUser.value = null
  overrideForm.value.userId = undefined
}

function openCreateOverride() {
  overrideForm.value = { type: 'ORDER', rate: 0 }
  overrideTarget.value = 'user'
  overrideFormError.value = null
  selectedUser.value = null
  userSearch.value = ''
  userSearchResults.value = []
  showOverrideModal.value = true
}

async function handleCreateOverride() {
  overrideFormError.value = null
  const target = overrideTarget.value === 'user' ? overrideForm.value.userId : overrideForm.value.planId
  if (!target) {
    overrideFormError.value = `Selecciona un ${overrideTarget.value === 'user' ? 'usuario' : 'plan'}.`
    return
  }
  savingOverride.value = true
  try {
    const dto = overrideTarget.value === 'user'
      ? { type: overrideForm.value.type, rate: overrideForm.value.rate, payer: overrideForm.value.payer, userId: overrideForm.value.userId }
      : { type: overrideForm.value.type, rate: overrideForm.value.rate, payer: overrideForm.value.payer, planId: overrideForm.value.planId }
    const created = await createOverride(dto)
    overrides.value.unshift(created)
    showOverrideModal.value = false
    showToast('Excepción creada')
  } catch (e: any) {
    overrideFormError.value = e.message
  } finally {
    savingOverride.value = false
  }
}

async function handleDeleteOverride(ov: PlatformFeeOverride) {
  try {
    await deleteOverride(ov.id)
    overrides.value = overrides.value.filter(o => o.id !== ov.id)
    showToast('Excepción eliminada')
  } catch (e: any) {
    error.value = e.message
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

onMounted(async () => {
  loading.value = true
  try {
    const [r, o] = await Promise.all([fetchRates(), fetchOverrides()])
    rates.value = r
    overrides.value = o
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>
