<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-4">
      <div class="p-3 bg-gradient-to-br from-workplace-red to-red-700 rounded-xl shadow-lg mr-3">
        <UserGroupIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Mis perfiles</h3>
    </div>
    <p class="text-sm text-gray-500 mb-4">
      Activa distintos perfiles dentro de WorkPlace sin crear otra cuenta: cliente, profesional, candidato de empleo o negocio.
    </p>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-14 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="type in PROFILE_TYPES"
        :key="type.value"
        class="rounded-xl border p-4"
        :class="statusStyle(profileFor(type.value)?.status)"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <component :is="type.icon" class="h-5 w-5 text-gray-500 shrink-0" />
            <div>
              <p class="text-sm font-bold text-gray-900">{{ type.label }}</p>
              <p class="text-xs text-gray-500">{{ type.description }}</p>
            </div>
          </div>

          <button
            v-if="!profileFor(type.value) || profileFor(type.value)?.status === 'REJECTED'"
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-workplace-red text-workplace-red hover:bg-workplace-red hover:text-white transition-colors shrink-0"
            :disabled="activatingType === type.value"
            @click="startActivation(type.value)"
          >
            {{ profileFor(type.value)?.status === 'REJECTED' ? 'Reintentar' : 'Activar' }}
          </button>
          <span v-else class="px-2.5 py-1 text-xs font-semibold rounded-full shrink-0" :class="statusBadge(profileFor(type.value)?.status)">
            {{ statusLabel(profileFor(type.value)?.status) }}
          </span>
        </div>

        <p v-if="profileFor(type.value)?.status === 'REJECTED' && profileFor(type.value)?.rejectionReason" class="text-xs text-red-700 mt-2">
          Motivo: {{ profileFor(type.value)?.rejectionReason }}
        </p>

        <p v-if="profileFor(type.value)?.status === 'PENDING' && profileFor(type.value)?.pendingPlan" class="text-xs text-amber-700 mt-2">
          Plan solicitado: {{ profileFor(type.value)?.pendingPlan?.name }}
        </p>

        <!-- Formulario (solo tipos que requieren categoría) -->
        <form v-if="activatingType === type.value" @submit.prevent="submit(type.value)" class="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <template v-if="type.requiresCategory">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Categoría</label>
              <select
                v-model="form.categoryId"
                class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
                required
                @change="onCategoryChange"
              >
                <option value="" disabled>Selecciona una categoría</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.icon || '🏢' }} {{ cat.name }}</option>
              </select>
            </div>

            <div v-if="subcategories.length > 0">
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Subcategoría <span class="font-normal text-gray-400">(opcional)</span></label>
              <select
                v-model="form.subcategoryId"
                class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
              >
                <option value="">Sin subcategoría</option>
                <option v-for="sub in subcategories" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
              </select>
            </div>

            <div v-if="type.value === 'PROFESSIONAL'">
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de profesional</label>
              <select
                v-model="form.subtype"
                class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
                required
              >
                <option value="" disabled>Selecciona una opción</option>
                <option value="FREELANCER">Freelancer (proyectos remotos)</option>
                <option value="SERVICE_PROVIDER">Proveedor de servicios (presenciales)</option>
              </select>
            </div>

            <div v-if="type.value === 'BUSINESS'">
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Nombre del negocio</label>
              <input
                v-model="form.commerceName"
                type="text"
                maxlength="120"
                placeholder="Ej. Panadería El Trigal"
                class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
                required
              />
            </div>

            <div v-if="form.categoryId">
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Plan <span class="font-normal text-gray-400">(opcional, puedes elegirlo después)</span></label>
              <div v-if="loadingPlans" class="text-xs text-gray-400">Cargando planes…</div>
              <select
                v-else
                v-model="form.planId"
                class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
              >
                <option value="">Sin plan por ahora</option>
                <option v-for="plan in plansForType" :key="plan.id" :value="plan.id">
                  {{ plan.name }} — {{ plan.price === 0 ? 'Gratis' : `$${plan.price}/mes` }}
                </option>
              </select>
            </div>
          </template>

          <p v-if="submitError" class="text-xs text-red-600">{{ submitError }}</p>

          <div class="flex items-center gap-2">
            <button
              type="submit"
              :disabled="(type.requiresCategory && !form.categoryId) || (type.value === 'BUSINESS' && !form.commerceName.trim()) || submitting"
              class="px-4 py-2 bg-workplace-red hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-colors"
            >
              {{ submitting ? 'Enviando…' : type.requiresApproval ? 'Enviar solicitud' : 'Activar' }}
            </button>
            <button type="button" class="text-xs text-gray-500 hover:text-gray-700" @click="cancelActivation">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { UserIcon, BriefcaseIcon, MagnifyingGlassIcon, BuildingStorefrontIcon, UserGroupIcon } from '@heroicons/vue/24/outline'
import { useProfileActivations, type ProfileActivation, type ProfileActivationType, type ProfileActivationStatus } from '~/composables/users/useProfileActivations'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const { mine: profiles, fetchMine, create } = useProfileActivations()
const { get: apiGet } = useApi()

const loading = ref(true)
const activatingType = ref<ProfileActivationType | null>(null)
const submitting = ref(false)
const submitError = ref('')
const categories = ref<{ id: string; name: string; icon?: string }[]>([])
const subcategories = ref<{ id: string; name: string }[]>([])
const plans = ref<{ id: string; name: string; price: number; forCommerce?: boolean; forFreelancer?: boolean }[]>([])
const loadingPlans = ref(false)
const form = ref({ categoryId: '', subcategoryId: '', subtype: '', commerceName: '', planId: '' })

// El plan mostrado depende del tipo de perfil que se está solicitando —
// mismo criterio de compatibilidad que valida ProfileActivationsService.create().
const plansForType = computed(() => {
  if (activatingType.value === 'BUSINESS') return plans.value.filter(p => p.forCommerce)
  if (activatingType.value === 'PROFESSIONAL') return plans.value.filter(p => p.forFreelancer)
  return []
})

const PROFILE_TYPES: Array<{
  value: ProfileActivationType
  label: string
  description: string
  icon: any
  requiresCategory: boolean
  requiresApproval: boolean
}> = [
  { value: 'CUSTOMER', label: 'Cliente', description: 'Comprar productos y contratar servicios.', icon: UserIcon, requiresCategory: false, requiresApproval: false },
  { value: 'PROFESSIONAL', label: 'Profesional', description: 'Ofrecer servicios como freelancer o proveedor.', icon: BriefcaseIcon, requiresCategory: true, requiresApproval: true },
  { value: 'JOB_SEEKER', label: 'Candidato de empleo', description: 'Buscar y postular a ofertas de empleo.', icon: MagnifyingGlassIcon, requiresCategory: false, requiresApproval: false },
  { value: 'BUSINESS', label: 'Negocio', description: 'Vender productos y gestionar un comercio.', icon: BuildingStorefrontIcon, requiresCategory: true, requiresApproval: true },
]

function profileFor(type: ProfileActivationType): ProfileActivation | undefined {
  return profiles.value.find(p => p.type === type && p.status !== 'REJECTED') ?? profiles.value.find(p => p.type === type)
}

function statusLabel(status?: ProfileActivationStatus) {
  if (status === 'PENDING') return 'En revisión'
  if (status === 'ACTIVE') return 'Activo'
  if (status === 'SUSPENDED') return 'Suspendido'
  return ''
}

function statusBadge(status?: ProfileActivationStatus) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (status === 'ACTIVE') return 'bg-green-100 text-green-700'
  if (status === 'SUSPENDED') return 'bg-gray-200 text-gray-700'
  return ''
}

function statusStyle(status?: ProfileActivationStatus) {
  if (status === 'PENDING') return 'bg-amber-50 border-amber-100'
  if (status === 'ACTIVE') return 'bg-green-50 border-green-100'
  if (status === 'REJECTED') return 'bg-red-50 border-red-100'
  return 'bg-gray-50 border-gray-100'
}

async function loadCategories() {
  try {
    categories.value = await apiGet('/users/categories')
  } catch { /* no bloquea el resto del perfil */ }
}

async function onCategoryChange() {
  form.value.subcategoryId = ''
  form.value.planId = ''
  subcategories.value = []
  if (!form.value.categoryId) return
  try {
    subcategories.value = await apiGet(`/users/categories/${form.value.categoryId}/subcategories`)
  } catch { /* sin subcategorías es un caso válido */ }
  loadingPlans.value = true
  try {
    plans.value = await apiGet(`/plans/public?categoryId=${form.value.categoryId}`)
  } catch { /* elegir plan es opcional, no bloquea la solicitud */ }
  finally { loadingPlans.value = false }
}

function startActivation(type: ProfileActivationType) {
  activatingType.value = type
  submitError.value = ''
  form.value = { categoryId: '', subcategoryId: '', subtype: '', commerceName: '', planId: '' }
  plans.value = []
}

function cancelActivation() {
  activatingType.value = null
  submitError.value = ''
}

async function submit(type: ProfileActivationType) {
  submitError.value = ''
  submitting.value = true
  try {
    await create({
      type,
      subtype: type === 'PROFESSIONAL' ? (form.value.subtype as any) : undefined,
      categoryId: form.value.categoryId || undefined,
      subcategoryId: form.value.subcategoryId || undefined,
      commerceName: type === 'BUSINESS' ? form.value.commerceName.trim() : undefined,
      planId: form.value.planId || undefined,
      planInterval: form.value.planId ? 'MONTHLY' : undefined,
    })
    activatingType.value = null
  } catch (e: any) {
    submitError.value = getApiErrorMessage(e, 'Error al activar el perfil')
  } finally {
    submitting.value = false
  }
}

loadCategories()
fetchMine().finally(() => { loading.value = false })
</script>
