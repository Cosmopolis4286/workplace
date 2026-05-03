<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">

    <!-- Hero -->
    <div class="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white py-20 px-6 text-center">
      <div class="max-w-3xl mx-auto">
        <span class="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 backdrop-blur-sm">
          Planes y Precios
        </span>
        <h1 class="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
          Elige el plan perfecto<br class="hidden sm:block" /> para tu negocio
        </h1>
        <p class="text-red-100 text-lg mb-8 max-w-xl mx-auto">
          Empieza gratis y escala cuando lo necesites. Sin contratos, cancela cuando quieras.
        </p>
        <div class="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl p-1.5">
          <button
            :class="['px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200', !annual ? 'bg-white text-red-600 shadow-sm' : 'text-white/80 hover:text-white']"
            @click="annual = false"
          >Mensual</button>
          <button
            :class="['px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200', annual ? 'bg-white text-red-600 shadow-sm' : 'text-white/80 hover:text-white']"
            @click="annual = true"
          >
            Anual
            <span class="ml-1.5 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">-20%</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Flujo de upgrade para usuario NORMAL ─────────────────────────────── -->
    <div v-if="isNormalUser" class="max-w-2xl mx-auto px-6 py-12">

      <!-- Banner bienvenida -->
      <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 mb-8">
        <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-blue-800">Expande tu cuenta</p>
          <p class="text-xs text-blue-600">Elige tu sector y un plan para convertirte en freelancer o comercio.</p>
        </div>
      </div>

      <!-- Step indicator -->
      <div class="flex items-center gap-2 mb-8 justify-center">
        <template v-for="(label, i) in upgradeSteps" :key="i">
          <div class="flex items-center gap-1.5">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              :class="i < upgradeStep ? 'bg-workplace-red text-white' : i === upgradeStep ? 'bg-workplace-red text-white ring-4 ring-workplace-red/20' : 'bg-gray-200 text-gray-400'"
            >
              <svg v-if="i < upgradeStep" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="text-xs font-medium hidden sm:block" :class="i <= upgradeStep ? 'text-gray-700' : 'text-gray-400'">{{ label }}</span>
          </div>
          <div v-if="i < upgradeSteps.length - 1" class="flex-1 h-0.5 max-w-12 rounded-full" :class="i < upgradeStep ? 'bg-workplace-red' : 'bg-gray-200'" />
        </template>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

        <!-- Step 0: Categoría -->
        <template v-if="upgradeStep === 0">
          <h2 class="text-base font-semibold text-gray-800 mb-1">¿En qué sector está tu negocio?</h2>
          <p class="text-xs text-gray-500 mb-4">Esto define qué módulos estarán disponibles para ti.</p>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <div v-if="loadingCats" class="flex justify-center py-4">
              <div class="w-6 h-6 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
            </div>
            <div v-else class="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                @click="selectCategory(cat.id)"
                class="flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all hover:border-workplace-red/40"
                :class="selectedCategory === cat.id ? 'border-workplace-red bg-red-50' : 'border-gray-200'"
              >
                <span class="text-xl leading-none">{{ cat.icon || '🏢' }}</span>
                <span class="text-sm font-medium text-gray-700 leading-tight">{{ cat.name }}</span>
              </button>
            </div>
          </div>
          <div v-if="selectedCategory && subcategories.length > 0" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Subcategoría (opcional)</label>
            <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              <button
                v-for="sub in subcategories"
                :key="sub.id"
                type="button"
                @click="selectedSubcategory = sub.id"
                class="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all hover:border-workplace-red/40"
                :class="selectedSubcategory === sub.id ? 'border-workplace-red bg-red-50' : 'border-gray-200'"
              >
                <span class="text-sm font-medium text-gray-700 leading-tight">{{ sub.name }}</span>
              </button>
            </div>
          </div>
          <p v-if="catError" class="text-xs text-red-500 mt-2">{{ catError }}</p>
        </template>

        <!-- Step 1: Plan -->
        <template v-if="upgradeStep === 1">
          <h2 class="text-base font-semibold text-gray-800 mb-1">Elige tu plan</h2>
          <p class="text-xs text-gray-500 mb-4">Puedes cambiarlo en cualquier momento.</p>
          <div v-if="loadingPlans" class="flex justify-center py-8">
            <div class="w-6 h-6 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
          </div>
          <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1">
            <button
              v-for="plan in plans"
              :key="plan.id"
              type="button"
              @click="selectedPlan = plan.id"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all hover:border-workplace-red/40"
              :class="selectedPlan === plan.id ? 'border-workplace-red bg-red-50' : 'border-gray-200'"
            >
              <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: plan.color || '#ef4444' }" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-sm text-gray-800">{{ plan.name }}</span>
                  <span v-if="plan.isPopular" class="text-xs bg-red-100 text-workplace-red px-1.5 py-0.5 rounded font-medium">Popular</span>
                  <span v-if="planTargetRole(plan)" :class="['text-[10px] px-1.5 py-0.5 rounded font-bold', planTargetRole(plan) === 'FREELANCER' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700']">
                    {{ planTargetRole(plan) === 'FREELANCER' ? 'Freelancer' : 'Comercio' }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 truncate mt-0.5">{{ plan.description }}</p>
              </div>
              <span class="font-bold text-sm text-gray-800 flex-shrink-0">
                {{ currentPrice(plan) === 0 ? 'Gratis' : formatPrice(currentPrice(plan)) + (annual ? '/año' : '/mes') }}
              </span>
            </button>
          </div>
        </template>

        <!-- Step 2: Confirmar -->
        <template v-if="upgradeStep === 2">
          <h2 class="text-base font-semibold text-gray-800 mb-1">Confirmar upgrade</h2>
          <p class="text-xs text-gray-500 mb-4">Revisa los detalles antes de continuar.</p>
          <div class="space-y-3">
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span class="text-xs text-gray-500">Plan</span>
              <span class="text-sm font-semibold text-gray-800">{{ selectedPlanObj?.name }}</span>
            </div>
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span class="text-xs text-gray-500">Sector</span>
              <span class="text-sm font-semibold text-gray-800">{{ selectedCategoryObj?.name }}</span>
            </div>
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span class="text-xs text-gray-500">Precio</span>
              <span class="text-sm font-bold text-gray-800">
                {{ selectedPlanObj && currentPrice(selectedPlanObj) === 0 ? 'Gratis' : (selectedPlanObj ? formatPrice(currentPrice(selectedPlanObj)) + (annual ? '/año' : '/mes') : '—') }}
              </span>
            </div>
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span class="text-xs text-gray-500">Tu nuevo rol</span>
              <span :class="['text-xs font-bold px-2 py-0.5 rounded-full', selectedPlanObj && planTargetRole(selectedPlanObj) === 'FREELANCER' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700']">
                {{ selectedPlanObj && planTargetRole(selectedPlanObj) === 'FREELANCER' ? 'Freelancer' : 'Comercio' }}
              </span>
            </div>
          </div>
          <div class="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
            Al confirmar, tu cuenta se actualizará y pasarás al flujo de configuración de tu nuevo perfil.
          </div>
        </template>

        <!-- Step 3: Listo -->
        <template v-if="upgradeStep === 3">
          <div class="text-center py-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 class="text-lg font-bold text-gray-900 mb-1">¡Upgrade exitoso!</h2>
            <p class="text-sm text-gray-500">Tu cuenta fue actualizada. Redirigiendo al panel de configuración...</p>
          </div>
        </template>

        <p v-if="upgradeError" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{{ upgradeError }}</p>

        <!-- Actions -->
        <div class="flex gap-3 mt-5">
          <button
            v-if="upgradeStep > 0 && upgradeStep < 3"
            type="button"
            :disabled="upgrading"
            class="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors"
            @click="upgradeStep--"
          >Atrás</button>
          <button
            v-if="upgradeStep < 2"
            type="button"
            @click="nextUpgradeStep"
            class="flex-1 py-2.5 bg-workplace-red text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >Continuar</button>
          <button
            v-if="upgradeStep === 2"
            type="button"
            :disabled="upgrading"
            class="flex-1 py-2.5 bg-workplace-red text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
            @click="confirmUpgrade"
          >{{ upgrading ? 'Procesando...' : 'Confirmar upgrade' }}</button>
        </div>
      </div>
    </div>

    <!-- ── Vista normal (no NORMAL o no autenticado) ────────────────────────── -->
    <div v-else class="max-w-6xl mx-auto px-6 py-16">

      <div v-if="error" class="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="text-sm">{{ error }}</span>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse shadow-sm">
          <div class="h-5 bg-gray-200 rounded w-1/2 mb-3" />
          <div class="h-9 bg-gray-200 rounded w-1/3 mb-2" />
          <div class="h-4 bg-gray-100 rounded w-3/4 mb-6" />
          <div class="space-y-2">
            <div class="h-3 bg-gray-100 rounded w-full" />
            <div class="h-3 bg-gray-100 rounded w-4/5" />
            <div class="h-3 bg-gray-100 rounded w-full" />
          </div>
          <div class="h-10 bg-gray-200 rounded-xl mt-6" />
        </div>
      </div>

      <div v-else-if="plans.length === 0" class="text-center py-16 text-gray-400">
        <svg class="w-14 h-14 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <p class="text-lg font-medium">No hay planes disponibles en este momento</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="plan in plans"
          :key="plan.id"
          :class="['relative bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col overflow-hidden', plan.isPopular ? 'border-red-500 shadow-red-100' : 'border-gray-200']"
        >
          <div v-if="plan.isPopular" class="bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold text-center py-1.5 tracking-wide uppercase">
            Más Popular
          </div>
          <div class="p-6 pb-4">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-xl font-bold text-gray-900">{{ plan.name }}</h3>
                <p class="text-sm text-gray-500 mt-0.5">{{ plan.description }}</p>
              </div>
              <div v-if="plan.color" class="w-4 h-4 rounded-full flex-shrink-0 mt-1" :style="{ backgroundColor: plan.color }" />
            </div>
            <div class="mt-4">
              <template v-if="currentPrice(plan) === 0">
                <span class="text-4xl font-extrabold text-gray-900">Gratis</span>
              </template>
              <template v-else>
                <span class="text-4xl font-extrabold text-gray-900">{{ formatPrice(currentPrice(plan)) }}</span>
                <span class="text-gray-400 text-sm ml-1">/ {{ annual ? 'año' : 'mes' }}</span>
              </template>
              <p v-if="annual && plan.priceAnnual && plan.priceMonthly" class="text-xs text-green-600 font-medium mt-1">
                Ahorras {{ formatPrice((plan.priceMonthly * 12) - plan.priceAnnual) }} al año
              </p>
            </div>
          </div>
          <div class="px-6 pb-6 flex-1">
            <ul class="space-y-2.5 mb-6">
              <li v-for="(feature, fi) in plan.features" :key="fi" class="flex items-start gap-2.5">
                <svg class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <span class="text-sm text-gray-700">{{ feature }}</span>
              </li>
            </ul>
            <div class="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1 mb-6">
              <div class="flex justify-between"><span>Productos</span><span class="font-medium text-gray-700">{{ formatLimit(plan.maxProducts) }}</span></div>
              <div class="flex justify-between"><span>Empleados</span><span class="font-medium text-gray-700">{{ formatLimit(plan.maxEmployees) }}</span></div>
              <div class="flex justify-between"><span>Sucursales</span><span class="font-medium text-gray-700">{{ formatLimit(plan.maxBranches) }}</span></div>
            </div>
            <NuxtLink
              :to="isAuthenticated ? '/mi-plan' : '/register'"
              :class="['block w-full text-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200', plan.isPopular ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 shadow-sm' : 'bg-gray-100 text-gray-800 hover:bg-gray-200']"
            >
              {{ isAuthenticated ? 'Ver mi plan' : (currentPrice(plan) === 0 ? 'Empezar gratis' : 'Contratar') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer CTA -->
    <div class="border-t border-gray-200 bg-white py-12 px-6 text-center">
      <h3 class="text-xl font-bold text-gray-900 mb-2">¿Tienes preguntas?</h3>
      <p class="text-gray-500 mb-4">Nuestro equipo está listo para ayudarte a elegir el plan ideal.</p>
      <a href="mailto:soporte@workplacemanager.com" class="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:from-red-600 hover:to-rose-600 transition-all shadow-sm hover:shadow-md">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        Contáctanos
      </a>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'

definePageMeta({})

interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceAnnual?: number
  price?: number
  color?: string
  isPopular?: boolean
  features: string[]
  maxProducts?: number | null
  maxEmployees?: number | null
  maxBranches?: number | null
  forFreelancer?: boolean
  forCommerce?: boolean
  forNormal?: boolean
}

interface Category {
  id: string
  name: string
  icon?: string
}

interface Subcategory {
  id: string
  name: string
}

const { user, isAuthenticated, fetchProfile, updateLocalUser } = useAuth()

// ── Shared state ──────────────────────────────────────────────────────────────
const plans = ref<Plan[]>([])
const categories = ref<Category[]>([])
const subcategories = ref<Subcategory[]>([])
const loading = ref(false)
const loadingCats = ref(false)
const loadingPlans = ref(false)
const error = ref<string | null>(null)
const annual = ref(false)

// ── Upgrade flow (only for NORMAL users) ─────────────────────────────────────
const upgradeSteps = ['Tu sector', 'Tu plan', 'Confirmar']
const upgradeStep = ref(0)
const selectedCategory = ref('')
const selectedSubcategory = ref('')
const selectedPlan = ref('')
const catError = ref('')
const upgradeError = ref('')
const upgrading = ref(false)

const isNormalUser = computed(() => isAuthenticated.value && user.value?.role === 'NORMAL')

const selectedPlanObj = computed(() => plans.value.find(p => p.id === selectedPlan.value) ?? null)
const selectedCategoryObj = computed(() => categories.value.find(c => c.id === selectedCategory.value) ?? null)

function planTargetRole(plan: Plan): 'FREELANCER' | 'COMMERCE' | null {
  if (plan.forFreelancer && !plan.forCommerce) return 'FREELANCER'
  if (plan.forCommerce) return 'COMMERCE'
  if (plan.forFreelancer) return 'FREELANCER'
  return null
}

function currentPrice(plan: Plan): number {
  if (annual.value && plan.priceAnnual) return plan.priceAnnual
  return plan.priceMonthly ?? plan.price ?? 0
}

function formatPrice(amount: number): string {
  if (amount === 0) return 'Gratis'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatLimit(value: number | null | undefined): string {
  if (value === null || value === undefined || value < 0) return 'Ilimitado'
  return value.toLocaleString('es-MX')
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadPlans() {
  loading.value = true
  loadingPlans.value = true
  try {
    const { get } = useApi()
    const data = await get('/plans/public')
    plans.value = Array.isArray(data) ? data : (data as any)?.data ?? []
  } catch (e: any) {
    error.value = e?.data?.message ?? e?.message ?? 'Error cargando planes'
  } finally {
    loading.value = false
    loadingPlans.value = false
  }
}

async function loadCategories() {
  if (categories.value.length > 0) return
  loadingCats.value = true
  try {
    const { get } = useApi()
    categories.value = await get('/users/categories')
  } catch { /* silently ignore */ }
  finally { loadingCats.value = false }
}

async function selectCategory(categoryId: string) {
  selectedCategory.value = categoryId
  selectedSubcategory.value = ''
  subcategories.value = []
  try {
    const { get } = useApi()
    subcategories.value = await get(`/users/categories/${categoryId}/subcategories`)
  } catch { /* silently ignore */ }
}

// ── Upgrade flow navigation ───────────────────────────────────────────────────
async function nextUpgradeStep() {
  upgradeError.value = ''
  if (upgradeStep.value === 0) {
    if (!selectedCategory.value) { catError.value = 'Selecciona un sector'; return }
    catError.value = ''
    upgradeStep.value = 1
  } else if (upgradeStep.value === 1) {
    upgradeStep.value = 2
  }
}

async function confirmUpgrade() {
  if (!selectedPlan.value || !selectedCategory.value) return
  upgradeError.value = ''
  upgrading.value = true
  try {
    const { post } = useApi()
    const result = await post('/plans/upgrade', {
      planId: selectedPlan.value,
      categoryId: selectedCategory.value,
      interval: annual.value ? 'ANNUAL' : 'MONTHLY',
    }) as any

    // Update local auth state
    updateLocalUser({ role: result.targetRole, categoryId: selectedCategory.value })
    await fetchProfile()

    // Clear onboarding flags so new-role onboarding triggers
    localStorage.removeItem('onboarding_completed')
    localStorage.removeItem('onboarding_step')
    localStorage.removeItem('onboarding_category')
    localStorage.removeItem('onboarding_subcategory')
    localStorage.removeItem('onboarding_plan')

    upgradeStep.value = 3
    setTimeout(() => navigateTo('/onboarding'), 1500)
  } catch (e: any) {
    upgradeError.value = e?.data?.message ?? e?.message ?? 'Error al procesar el upgrade. Intenta de nuevo.'
  } finally {
    upgrading.value = false
  }
}

onMounted(async () => {
  await loadPlans()
  if (isNormalUser.value) loadCategories()
})
</script>
