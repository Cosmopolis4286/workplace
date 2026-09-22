<template>
  <section class="max-w-2xl mx-auto py-6">

    <!-- Banner -->
    <div v-if="upgradeStep !== 3" class="flex items-start gap-4 bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8">
      <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <BoltIcon class="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <p class="text-sm font-semibold text-blue-900">Expande tu cuenta</p>
        <p class="text-sm text-blue-600 mt-0.5">Elige tu sector y un plan para convertirte en freelancer o comercio.</p>
      </div>
    </div>

    <!-- Steps -->
    <div v-if="upgradeStep !== 3" class="flex items-center gap-2 mb-8 justify-center">
      <template v-for="(label, i) in upgradeSteps" :key="i">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0"
            :class="i < upgradeStep
              ? 'bg-red-600 text-white'
              : i === upgradeStep
                ? 'bg-red-600 text-white ring-4 ring-red-600/20'
                : 'bg-gray-100 text-gray-400'"
          >
            <CheckIcon v-if="i < upgradeStep" class="w-4 h-4" />
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="text-xs font-medium hidden sm:block" :class="i <= upgradeStep ? 'text-gray-800' : 'text-gray-400'">{{ label }}</span>
        </div>
        <div
          v-if="i < upgradeSteps.length - 1"
          class="flex-1 h-0.5 max-w-14 rounded-full transition-colors duration-300"
          :class="i < upgradeStep ? 'bg-red-600' : 'bg-gray-200'"
        />
      </template>
    </div>

    <!-- Card de pasos -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6">

        <!-- Step 0: Categoría -->
        <template v-if="upgradeStep === 0 && categoryProposed">
          <div class="text-center py-6">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PencilSquareIcon class="w-8 h-8 text-blue-600" />
            </div>
            <h2 class="text-lg font-bold text-gray-900 mb-1">Propuesta enviada</h2>
            <p class="text-sm text-gray-500 max-w-xs mx-auto">
              Un administrador revisará tu propuesta de sector. Cuando la aprueben, vuelve aquí para completar tu solicitud de upgrade.
            </p>
          </div>
        </template>

        <template v-if="upgradeStep === 0 && !categoryProposed">
          <h2 class="text-base font-bold text-gray-900 mb-0.5">¿En qué sector está tu negocio?</h2>
          <p class="text-sm text-gray-500 mb-5">Esto define qué módulos estarán disponibles para ti.</p>

          <div v-if="loadingCats" class="flex justify-center py-8">
            <div class="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div v-else class="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              class="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-left transition-all hover:border-red-400/50"
              :class="selectedCategory === cat.id ? 'border-red-600 bg-red-50' : 'border-gray-200'"
              @click="selectCategory(cat.id)"
            >
              <span class="text-xl leading-none">{{ cat.icon || '🏢' }}</span>
              <span class="text-sm font-medium text-gray-700 leading-tight">{{ cat.name }}</span>
            </button>

            <!-- Otro: el usuario no encontró su rubro, propone uno nuevo para revisión del admin -->
            <button
              type="button"
              class="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 border-dashed text-left transition-all hover:border-red-400/50"
              :class="selectedCategory === OTHER ? 'border-red-600 bg-red-50' : 'border-gray-300'"
              @click="selectCategory(OTHER)"
            >
              <span class="text-xl leading-none">✏️</span>
              <span class="text-sm font-medium text-gray-700 leading-tight">Otro</span>
            </button>
          </div>

          <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div v-if="selectedCategory === OTHER" class="mt-4">
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">¿A qué se dedica tu negocio?</label>
              <textarea
                v-model="otherCategoryText"
                rows="2"
                maxlength="200"
                placeholder="Cuéntanos a qué se dedica, así lo agregamos al catálogo"
                class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />
              <p class="mt-1.5 text-xs text-gray-400">Un administrador revisará tu propuesta. Podrás continuar tu solicitud cuando la aprueben.</p>
            </div>
          </Transition>

          <div v-if="selectedCategory && selectedCategory !== OTHER && subcategories.length > 0" class="mt-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Subcategoría (opcional)</p>
            <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              <button
                v-for="sub in subcategories"
                :key="sub.id"
                type="button"
                class="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all hover:border-red-400/50"
                :class="selectedSubcategory === sub.id ? 'border-red-600 bg-red-50' : 'border-gray-200'"
                @click="selectedSubcategory = selectedSubcategory === sub.id ? '' : sub.id"
              >
                <span class="text-sm font-medium text-gray-700">{{ sub.icon || '📄' }} {{ sub.name }}</span>
              </button>

              <!-- Otro: propone una subcategoría nueva bajo la categoría ya elegida -->
              <button
                type="button"
                class="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed text-left transition-all hover:border-red-400/50"
                :class="selectedSubcategory === OTHER ? 'border-red-600 bg-red-50' : 'border-gray-300'"
                @click="selectedSubcategory = selectedSubcategory === OTHER ? '' : OTHER"
              >
                <span class="text-sm font-medium text-gray-700">✏️ Otro</span>
              </button>
            </div>

            <Transition
              enter-active-class="transition-all duration-150 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
            >
              <input
                v-if="selectedSubcategory === OTHER"
                v-model="otherSubcategoryText"
                type="text"
                maxlength="80"
                placeholder="Nombre de la subcategoría"
                class="w-full mt-2.5 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </Transition>
          </div>
          <p v-if="catError" class="text-xs text-red-600 mt-3 flex items-center gap-1">
            <ExclamationCircleIcon class="w-3.5 h-3.5" />{{ catError }}
          </p>
        </template>

        <!-- Step 1: Plan -->
        <template v-if="upgradeStep === 1">
          <h2 class="text-base font-bold text-gray-900 mb-0.5">Elige tu plan</h2>
          <p class="text-sm text-gray-500 mb-5">Puedes cambiarlo en cualquier momento.</p>
          <div v-if="loadingPlans" class="flex justify-center py-8">
            <div class="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div v-else class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            <button
              v-for="plan in plans"
              :key="plan.id"
              type="button"
              class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all hover:border-red-400/50"
              :class="selectedPlan === plan.id ? 'border-red-600 bg-red-50' : 'border-gray-200'"
              @click="selectedPlan = plan.id"
            >
              <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: plan.color || '#ef4444' }" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-sm text-gray-900">{{ plan.name }}</span>
                  <span v-if="plan.isPopular" class="badge bg-red-100 text-red-700">Popular</span>
                  <span
                    v-if="planTargetRole(plan)"
                    class="badge text-[10px]"
                    :class="planTargetRole(plan) === 'FREELANCER' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'"
                  >{{ planTargetRole(plan) === 'FREELANCER' ? 'Freelancer' : 'Comercio' }}</span>
                </div>
                <p class="text-xs text-gray-500 truncate mt-0.5">{{ plan.description }}</p>
              </div>
              <span class="font-bold text-sm text-gray-900 flex-shrink-0">
                {{ currentPrice(plan) === 0 ? 'Gratis' : formatPrice(currentPrice(plan)) + (annual ? '/año' : '/mes') }}
              </span>
            </button>
          </div>
        </template>

        <!-- Step 2: Confirmar -->
        <template v-if="upgradeStep === 2">
          <h2 class="text-base font-bold text-gray-900 mb-0.5">Confirmar upgrade</h2>
          <p class="text-sm text-gray-500 mb-5">Revisa los detalles antes de continuar.</p>
          <div class="space-y-2.5">
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span class="text-xs text-gray-500">Plan</span>
              <span class="text-sm font-semibold text-gray-900">{{ selectedPlanObj?.name }}</span>
            </div>
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span class="text-xs text-gray-500">Sector</span>
              <span class="text-sm font-semibold text-gray-900">{{ selectedCategoryObj?.name }}</span>
            </div>
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span class="text-xs text-gray-500">Precio</span>
              <span class="text-sm font-bold text-gray-900">
                {{ selectedPlanObj && currentPrice(selectedPlanObj) === 0 ? 'Gratis' : (selectedPlanObj ? formatPrice(currentPrice(selectedPlanObj)) + (annual ? '/año' : '/mes') : '—') }}
              </span>
            </div>
            <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span class="text-xs text-gray-500">Tu nuevo rol</span>
              <span
                class="badge"
                :class="selectedPlanObj && planTargetRole(selectedPlanObj) === 'FREELANCER' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'"
              >{{ selectedPlanObj && planTargetRole(selectedPlanObj) === 'FREELANCER' ? 'Freelancer' : 'Comercio' }}</span>
            </div>
          </div>

          <div v-if="selectedPlanObj && planTargetRole(selectedPlanObj) === 'COMMERCE'" class="mt-4">
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">Nombre del negocio</label>
            <input
              v-model="commerceName"
              type="text"
              maxlength="120"
              placeholder="Ej. Panadería El Trigal"
              class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
            />
          </div>

          <div class="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
            Al confirmar, tu solicitud quedará en revisión y un administrador deberá aprobarla antes de activar tu nuevo rol.
          </div>
          <div
            v-if="myKycStatus?.kycStatus !== 'APPROVED'"
            class="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed"
          >
            Además, tu administrador no podrá aprobar este upgrade hasta que verifiques tu identidad (KYC).
            <NuxtLink to="/profile" class="font-semibold underline">Completa la verificación desde tu perfil</NuxtLink>.
          </div>
        </template>

        <!-- Step 3: Listo -->
        <template v-if="upgradeStep === 3">
          <div class="text-center py-6">
            <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClockIcon class="w-8 h-8 text-yellow-600" />
            </div>
            <h2 class="text-lg font-bold text-gray-900 mb-1">¡Solicitud enviada!</h2>
            <p class="text-sm text-gray-500">Tu solicitud está pendiente de aprobación por un administrador. Te notificaremos cuando sea revisada.</p>
          </div>
        </template>

        <p v-if="upgradeError" class="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5 mt-4 flex items-center gap-1.5">
          <ExclamationCircleIcon class="w-3.5 h-3.5 flex-shrink-0" />{{ upgradeError }}
        </p>
      </div>

      <!-- Acciones -->
      <div v-if="upgradeStep < 3 && !categoryProposed" class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        <button
          v-if="upgradeStep > 0"
          type="button"
          :disabled="upgrading"
          class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 bg-white rounded-xl transition-colors disabled:opacity-50"
          @click="upgradeStep--"
        >← Atrás</button>
        <button
          v-if="upgradeStep < 2"
          type="button"
          :disabled="proposingCategory"
          class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
          @click="nextUpgradeStep"
        >
          <span v-if="proposingCategory" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {{ proposingCategory ? 'Enviando…' : 'Continuar →' }}
        </button>
        <button
          v-if="upgradeStep === 2"
          type="button"
          :disabled="upgrading || !!(selectedPlanObj && planTargetRole(selectedPlanObj) === 'COMMERCE' && !commerceName.trim())"
          class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
          @click="confirmUpgrade"
        >
          <span v-if="upgrading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {{ upgrading ? 'Procesando...' : 'Confirmar upgrade' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { BoltIcon, CheckIcon, ExclamationCircleIcon, ClockIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { useKyc } from '~/composables/kyc/useKyc'
import { usePlans } from '~/composables/commerce/usePlans'
import { useMoneyFormat } from '~/composables/core/useMoneyFormat'
import { useProfileActivations } from '~/composables/users/useProfileActivations'
import { useProposedCategories } from '~/composables/admin/useProposedCategories'

export interface PricingPlan {
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
  maxOrders?: number | null
  forFreelancer?: boolean
  forCommerce?: boolean
  forNormal?: boolean
}

interface Category { id: string; name: string; icon?: string }
interface Subcategory { id: string; name: string; icon?: string }

const props = defineProps<{
  plans: PricingPlan[]
  loadingPlans: boolean
  annual: boolean
}>()

const emit = defineEmits<{
  completed: []
  'update:step': [step: number]
}>()

// Sentinel para "Otro" — mismo patrón que OnboardingSectorStep.vue y
// ProfileActivationsCard.vue, para consistencia entre los 3 puntos de
// entrada a profile-activations.
const OTHER = '__OTHER__'

const { fetchProfile } = useAuth()
const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const { pendingSubscription, fetchMySubscription } = usePlans()
const { formatPrice } = useMoneyFormat()
const { create: createProfileActivation } = useProfileActivations()
const { propose } = useProposedCategories()

const categories    = ref<Category[]>([])
const subcategories = ref<Subcategory[]>([])
const loadingCats   = ref(false)

const upgradeSteps    = ['Tu sector', 'Tu plan', 'Confirmar']
const upgradeStep     = ref(0)
const selectedCategory    = ref('')
const selectedSubcategory = ref('')
const selectedPlan    = ref('')
const commerceName    = ref('')
const otherCategoryText    = ref('')
const otherSubcategoryText = ref('')
const catError        = ref('')
const upgradeError     = ref('')
const upgrading        = ref(false)
const proposingCategory = ref(false)
const categoryProposed  = ref(false)

const selectedPlanObj    = computed(() => props.plans.find(p => p.id === selectedPlan.value) ?? null)
const selectedCategoryObj = computed(() => categories.value.find(c => c.id === selectedCategory.value) ?? null)

function planTargetRole(plan: PricingPlan): 'FREELANCER' | 'COMMERCE' | null {
  if (plan.forFreelancer && !plan.forCommerce) return 'FREELANCER'
  if (plan.forCommerce) return 'COMMERCE'
  if (plan.forFreelancer) return 'FREELANCER'
  return null
}

function currentPrice(plan: PricingPlan): number {
  if (props.annual && plan.priceAnnual) return plan.priceAnnual
  return plan.priceMonthly ?? plan.price ?? 0
}

async function loadCategories() {
  if (categories.value.length > 0) return
  loadingCats.value = true
  try {
    const { get } = useApi()
    categories.value = await get('/users/categories')
  } catch { } finally { loadingCats.value = false }
}

async function selectCategory(categoryId: string) {
  selectedCategory.value = categoryId
  selectedSubcategory.value = ''
  subcategories.value = []
  try {
    const { get } = useApi()
    subcategories.value = await get(`/users/categories/${categoryId}/subcategories`)
  } catch { }
}

async function nextUpgradeStep() {
  upgradeError.value = ''
  if (upgradeStep.value === 0) {
    if (!selectedCategory.value) { catError.value = 'Selecciona un sector para continuar'; return }
    if (selectedCategory.value === OTHER && !otherCategoryText.value.trim()) {
      catError.value = 'Cuéntanos a qué se dedica tu negocio'
      return
    }
    if (selectedSubcategory.value === OTHER && !otherSubcategoryText.value.trim()) {
      catError.value = 'Escribe el nombre de la subcategoría'
      return
    }
    catError.value = ''

    if (selectedCategory.value === OTHER) {
      // Sin categoría real todavía no hay categoryId que llevar a los pasos
      // siguientes (plan filtrado por sector, confirmación) — se propone y
      // se corta el wizard acá, igual trade-off que ProfileActivationsCard.
      proposingCategory.value = true
      try {
        await propose({ name: otherCategoryText.value.trim(), target: 'USER_CATEGORY' })
        categoryProposed.value = true
      } catch (e: any) {
        catError.value = getApiErrorMessage(e, 'Error al enviar la propuesta. Intenta de nuevo.')
      } finally {
        proposingCategory.value = false
      }
      return
    }

    if (selectedSubcategory.value === OTHER) {
      proposingCategory.value = true
      try {
        await propose({
          name: otherSubcategoryText.value.trim(),
          target: 'USER_CATEGORY',
          parentCategoryId: selectedCategory.value,
        })
      } catch (e: any) {
        catError.value = getApiErrorMessage(e, 'Error al enviar la propuesta. Intenta de nuevo.')
        proposingCategory.value = false
        return
      }
      proposingCategory.value = false
      // La subcategoría propuesta no existe todavía — se sigue sin ella
      // (mismo trade-off que onboarding.vue), el sector sí es real.
      selectedSubcategory.value = ''
    }

    upgradeStep.value = 1
  } else if (upgradeStep.value === 1) {
    upgradeStep.value = 2
  }
}

// Único punto de entrada para "convertirme en freelancer o comercio":
// crea/reutiliza el UserProfile PENDING vía profile-activations (misma
// puerta que usa /profile → "Mis perfiles"), con el plan elegido adjunto
// como pendingPlanId — se activa como Subscription real recién al aprobar
// (ver ProfileActivationsService.review()). Reemplaza POST /plans/upgrade,
// que creaba una segunda solicitud paralela sin relación con UserProfile.
async function confirmUpgrade() {
  if (!selectedPlan.value || !selectedCategory.value || selectedCategory.value === OTHER) return
  const targetRole = selectedPlanObj.value ? planTargetRole(selectedPlanObj.value) : null
  if (!targetRole) return
  if (targetRole === 'COMMERCE' && !commerceName.value.trim()) return

  upgradeError.value = ''
  upgrading.value = true
  try {
    await createProfileActivation({
      type: targetRole === 'COMMERCE' ? 'BUSINESS' : 'PROFESSIONAL',
      subtype: targetRole === 'FREELANCER' ? 'FREELANCER' : undefined,
      categoryId: selectedCategory.value,
      subcategoryId: selectedSubcategory.value && selectedSubcategory.value !== OTHER ? selectedSubcategory.value : undefined,
      commerceName: targetRole === 'COMMERCE' ? commerceName.value.trim() : undefined,
      planId: selectedPlan.value,
      planInterval: props.annual ? 'ANNUAL' : 'MONTHLY',
    })

    await fetchProfile()

    upgradeStep.value = 3
    emit('completed')
  } catch (e: any) {
    upgradeError.value = getApiErrorMessage(e, 'Error al procesar el upgrade. Intenta de nuevo.')
  } finally { upgrading.value = false }
}

watch(pendingSubscription, (pending) => {
  if (!pending) loadCategories()
}, { immediate: true })

watch(upgradeStep, (step) => emit('update:step', step), { immediate: true })

fetchMyKycStatus()
</script>
