<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/40 flex items-center justify-center p-4">
    <div class="w-full max-w-lg">

      <!-- Logo / Brand -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-red-600 rounded-2xl shadow-lg shadow-red-200 mb-4">
          <BoltIcon class="w-7 h-7 text-white" />
        </div>
        <h1 class="text-2xl font-black text-gray-900">
          {{ step === 2 ? '¡Todo listo!' : '¡Bienvenido!' }}
        </h1>
        <p class="text-gray-500 mt-1.5 text-sm max-w-xs mx-auto leading-relaxed">
          {{ step === 2
            ? 'Tu cuenta está configurada. Ahora puedes empezar a usar tu panel.'
            : 'Cuéntanos un poco sobre tu negocio para personalizar tu experiencia.' }}
        </p>
      </div>

      <OnboardingStepIndicator :steps="steps" :current-step="step" />

      <!-- Card principal -->
      <Transition
        enter-active-class="duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-3"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        mode="out-in"
      >
        <div :key="step" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <OnboardingSectorStep
            v-if="step === 0"
            :loading="loadingCats"
            :categories="categories"
            :subcategories="subcategories"
            :selected-category="selectedCategory"
            :selected-subcategory="selectedSubcategory"
            :error="catError"
            @select-category="selectCategory"
            @update:selected-subcategory="selectedSubcategory = $event"
          />

          <OnboardingPlanStep
            v-if="step === 1"
            :loading="loadingPlans"
            :plans="plans"
            :selected-plan="selectedPlan"
            @update:selected-plan="selectedPlan = $event"
          />

          <OnboardingDoneStep
            v-if="step === 2"
            :category-obj="selectedCategoryObj"
            :plan-obj="selectedPlanObj"
          />

          <!-- Error -->
          <div v-if="saveError" class="mx-6 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-center gap-1.5">
            <ExclamationCircleIcon class="h-3.5 w-3.5 flex-shrink-0" />{{ saveError }}
          </div>

          <!-- Acciones -->
          <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex gap-3">
            <!-- Omitir (solo step 0) -->
            <button
              v-if="step === 0"
              type="button"
              class="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors px-2"
              @click="skipOnboarding"
            >Omitir</button>

            <!-- Continuar / Finalizar -->
            <button
              v-if="step < 2"
              type="button"
              :disabled="saving"
              class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              @click="next"
            >
              <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {{ saving ? 'Guardando...' : step === 1 ? 'Finalizar' : 'Continuar →' }}
            </button>

            <!-- Ir al panel -->
            <button
              v-if="step === 2"
              type="button"
              class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              @click="goToDashboard"
            >
              Ir al panel
              <ArrowRightIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </Transition>

      <!-- Nota de seguridad -->
      <p class="text-center text-xs text-gray-400 mt-5 flex items-center justify-center gap-1.5">
        <LockClosedIcon class="h-3 w-3" />
        Tus datos están protegidos y nunca se comparten con terceros
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { BoltIcon, ExclamationCircleIcon, ArrowRightIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import OnboardingStepIndicator from '~/components/onboarding/OnboardingStepIndicator.vue'
import OnboardingSectorStep from '~/components/onboarding/OnboardingSectorStep.vue'
import OnboardingPlanStep from '~/components/onboarding/OnboardingPlanStep.vue'
import OnboardingDoneStep from '~/components/onboarding/OnboardingDoneStep.vue'

definePageMeta({ middleware: 'auth' })

const { user, updateLocalUser } = useAuth()
const { invalidate: invalidateModules } = useModules()

// Namespaced por userId: sin esto, en un dispositivo compartido el progreso
// (o el "completado") de un usuario se filtraba a la sesión del siguiente
// que iniciara sesión en el mismo navegador.
function lsKey(name: string) {
  return `onboarding_${name}_${user.value?.id ?? 'anon'}`
}
const STORAGE_KEY    = () => lsKey('step')
const COMPLETION_KEY = () => lsKey('completed')

const step  = ref(0)
const steps = ['Tu negocio', 'Tu plan', '¡Listo!']

const categories      = ref<{ id: string; name: string; icon?: string }[]>([])
const subcategories   = ref<{ id: string; name: string }[]>([])
const plans           = ref<{ id: string; name: string; description?: string; price: number; color: string; isPopular: boolean }[]>([])
const selectedCategory    = ref('')
const selectedSubcategory = ref('')
const selectedPlan        = ref('')
const loadingCats  = ref(false)
const loadingPlans = ref(false)
const saving       = ref(false)
const catError     = ref('')
const saveError    = ref('')

const selectedCategoryObj = computed(() => categories.value.find(c => c.id === selectedCategory.value) ?? null)
const selectedPlanObj     = computed(() => plans.value.find(p => p.id === selectedPlan.value) ?? null)

watch(selectedPlan, (val) => { if (val) localStorage.setItem(lsKey('plan'), val) })

// ─── Carga de datos ───────────────────────────────────────────────────────────
async function loadCategories() {
  loadingCats.value = true
  try {
    const { get } = useApi()
    categories.value = await get('/users/categories')
  } catch { } finally { loadingCats.value = false }
}

async function loadSubcategories(categoryId: string) {
  if (!categoryId) { subcategories.value = []; selectedSubcategory.value = ''; return }
  try {
    const { get } = useApi()
    subcategories.value = await get(`/users/categories/${categoryId}/subcategories`)
  } catch { }
}

async function loadPlans() {
  loadingPlans.value = true
  try {
    const { get } = useApi()
    const role = user.value?.role ?? 'COMMERCE'
    const catParam = selectedCategory.value ? `&categoryId=${selectedCategory.value}` : ''
    plans.value = await get(`/plans/public?role=${role}${catParam}`)
  } catch { } finally { loadingPlans.value = false }
}

async function selectCategory(categoryId: string) {
  selectedCategory.value = categoryId
  selectedSubcategory.value = ''
  await loadSubcategories(categoryId)
}

// ─── Navegación ───────────────────────────────────────────────────────────────
async function next() {
  saveError.value = ''

  if (step.value === 0) {
    if (!selectedCategory.value) { catError.value = 'Selecciona una categoría para continuar'; return }
    catError.value = ''
    saving.value = true
    try {
      const { patch } = useApi()
      const payload: any = { categoryId: selectedCategory.value }
      if (selectedSubcategory.value) payload.subcategoryId = selectedSubcategory.value
      await patch(`/users/${user.value!.id}`, payload)
      const { fetchProfile } = useAuth()
      await fetchProfile()
      invalidateModules()
      await loadPlans()
      step.value = 1
      localStorage.setItem(STORAGE_KEY(), '1')
      localStorage.setItem(lsKey('category'), selectedCategory.value)
      if (selectedSubcategory.value) localStorage.setItem(lsKey('subcategory'), selectedSubcategory.value)
    } catch (e: any) { saveError.value = getApiErrorMessage(e, 'Error al guardar. Intenta de nuevo.') }
    finally { saving.value = false }

  } else if (step.value === 1) {
    saving.value = true
    try {
      if (selectedPlan.value) {
        const { post } = useApi()
        await post('/plans/self-subscribe', { planId: selectedPlan.value, interval: 'MONTHLY' })
        invalidateModules()
      }
      step.value = 2
      localStorage.setItem(STORAGE_KEY(), '2')
      localStorage.removeItem(lsKey('plan'))
    } catch (e: any) {
      saveError.value = getApiErrorMessage(e, 'Error al guardar el plan. Intenta de nuevo.')
    } finally { saving.value = false }
  }
}

async function goToDashboard() {
  localStorage.removeItem(STORAGE_KEY())
  localStorage.removeItem(lsKey('category'))
  localStorage.removeItem(lsKey('subcategory'))
  localStorage.removeItem(lsKey('plan'))
  localStorage.setItem(COMPLETION_KEY(), 'true')
  const { fetchProfile } = useAuth()
  await fetchProfile()
  invalidateModules()
  await navigateTo('/dashboard')
}

async function skipOnboarding() {
  localStorage.removeItem(STORAGE_KEY())
  localStorage.setItem(COMPLETION_KEY(), 'true')
  try { await navigateTo('/dashboard') }
  catch { window.location.href = '/dashboard' }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  const isCompleted = localStorage.getItem(COMPLETION_KEY()) === 'true'
  if (isCompleted || user.value?.categoryId) {
    localStorage.setItem(COMPLETION_KEY(), 'true')
    await navigateTo('/dashboard')
    return
  }

  const savedStep = parseInt(localStorage.getItem(STORAGE_KEY()) ?? '', 10)
  if (!isNaN(savedStep) && savedStep >= 1) {
    step.value = savedStep
    selectedCategory.value    = localStorage.getItem(lsKey('category')) || user.value?.categoryId || ''
    selectedSubcategory.value = localStorage.getItem(lsKey('subcategory')) || ''
    selectedPlan.value        = localStorage.getItem(lsKey('plan')) || ''
    if (selectedCategory.value) await loadSubcategories(selectedCategory.value)
    await Promise.all([loadCategories(), loadPlans()])
    return
  }

  await loadCategories()
})
</script>
