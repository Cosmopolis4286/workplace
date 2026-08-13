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

      <!-- Step indicator -->
      <div class="flex items-center gap-2 mb-6 justify-center">
        <template v-for="(label, i) in steps" :key="i">
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0"
              :class="i < step
                ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                : i === step
                  ? 'bg-red-600 text-white ring-4 ring-red-600/20'
                  : 'bg-gray-100 text-gray-400'"
            >
              <CheckIcon v-if="i < step" class="w-4 h-4" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span
              class="text-xs font-semibold hidden sm:block transition-colors duration-300"
              :class="i <= step ? 'text-gray-800' : 'text-gray-400'"
            >{{ label }}</span>
          </div>
          <div
            v-if="i < steps.length - 1"
            class="flex-1 h-0.5 max-w-14 rounded-full transition-colors duration-500"
            :class="i < step ? 'bg-red-600' : 'bg-gray-200'"
          />
        </template>
      </div>

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

          <!-- ── Step 0: Sector ──────────────────────────────────────────── -->
          <template v-if="step === 0">
            <div class="p-6">
              <h2 class="text-base font-bold text-gray-900 mb-0.5">¿En qué sector está tu negocio?</h2>
              <p class="text-sm text-gray-500 mb-5">Esto define qué módulos estarán disponibles para ti.</p>

              <div v-if="loadingCats" class="flex justify-center py-10">
                <div class="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <div v-else class="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                <button
                  v-for="cat in categories"
                  :key="cat.id"
                  type="button"
                  class="flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-left transition-all hover:border-red-400/50 hover:bg-red-50/50 active:scale-[0.98]"
                  :class="selectedCategory === cat.id
                    ? 'border-red-600 bg-red-50 shadow-sm shadow-red-100'
                    : 'border-gray-200'"
                  @click="selectCategory(cat.id)"
                >
                  <span class="text-xl leading-none flex-shrink-0">{{ cat.icon || '🏢' }}</span>
                  <span class="text-sm font-medium text-gray-700 leading-tight">{{ cat.name }}</span>
                  <CheckCircleIcon
                    v-if="selectedCategory === cat.id"
                    class="h-4 w-4 text-red-600 ml-auto flex-shrink-0"
                  />
                </button>
              </div>

              <Transition
                enter-active-class="duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
              >
                <div v-if="selectedCategory && subcategories.length > 0" class="mt-5">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    Subcategoría <span class="font-normal normal-case">(opcional)</span>
                  </p>
                  <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                    <button
                      v-for="sub in subcategories"
                      :key="sub.id"
                      type="button"
                      class="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all hover:border-red-400/50 hover:bg-red-50/50 active:scale-[0.98]"
                      :class="selectedSubcategory === sub.id
                        ? 'border-red-600 bg-red-50 shadow-sm shadow-red-100'
                        : 'border-gray-200'"
                      @click="selectedSubcategory = selectedSubcategory === sub.id ? '' : sub.id"
                    >
                      <span class="text-sm font-medium text-gray-700">{{ sub.name }}</span>
                      <CheckCircleIcon v-if="selectedSubcategory === sub.id" class="h-4 w-4 text-red-600 flex-shrink-0" />
                    </button>
                  </div>
                </div>
              </Transition>

              <p v-if="catError" class="text-xs text-red-600 mt-4 flex items-center gap-1.5">
                <ExclamationCircleIcon class="h-3.5 w-3.5 flex-shrink-0" />{{ catError }}
              </p>
            </div>
          </template>

          <!-- ── Step 1: Plan ────────────────────────────────────────────── -->
          <template v-if="step === 1">
            <div class="p-6">
              <h2 class="text-base font-bold text-gray-900 mb-0.5">Elige tu plan</h2>
              <p class="text-sm text-gray-500 mb-5">Puedes cambiarlo en cualquier momento desde tu perfil.</p>

              <div v-if="loadingPlans" class="flex justify-center py-10">
                <div class="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <div v-else class="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                <button
                  v-for="plan in plans"
                  :key="plan.id"
                  type="button"
                  class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all hover:border-red-400/50 active:scale-[0.99]"
                  :class="selectedPlan === plan.id
                    ? 'border-red-600 bg-red-50 shadow-sm shadow-red-100'
                    : 'border-gray-200'"
                  @click="selectedPlan = plan.id"
                >
                  <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: plan.color || '#ef4444' }" />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-sm text-gray-900">{{ plan.name }}</span>
                      <span v-if="plan.isPopular" class="badge bg-red-100 text-red-700">Popular</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate mt-0.5">{{ plan.description }}</p>
                  </div>
                  <div class="flex-shrink-0 text-right">
                    <span class="font-black text-sm text-gray-900">
                      {{ plan.price === 0 ? 'Gratis' : `$${plan.price}/mes` }}
                    </span>
                  </div>
                  <CheckCircleIcon v-if="selectedPlan === plan.id" class="h-4 w-4 text-red-600 flex-shrink-0" />
                </button>

                <!-- Opción omitir plan -->
                <button
                  type="button"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all hover:border-gray-300 text-gray-400"
                  :class="selectedPlan === '' ? 'border-gray-400 bg-gray-50' : 'border-dashed border-gray-200'"
                  @click="selectedPlan = ''"
                >
                  <div class="w-3 h-3 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  <span class="text-sm font-medium">Continuar sin plan (configurar después)</span>
                </button>
              </div>
            </div>
          </template>

          <!-- ── Step 2: Listo ───────────────────────────────────────────── -->
          <template v-if="step === 2">
            <div class="p-8 text-center">
              <!-- Animación celebración -->
              <div class="relative inline-flex mb-6">
                <div class="absolute inset-0 bg-green-400/20 rounded-full animate-ping" />
                <div class="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckIcon class="w-10 h-10 text-green-600" />
                </div>
              </div>

              <!-- Resumen -->
              <div v-if="selectedCategoryObj || selectedPlanObj" class="mb-6 bg-gray-50 rounded-2xl p-4 text-left space-y-2.5 text-sm">
                <div v-if="selectedCategoryObj" class="flex items-center justify-between">
                  <span class="text-gray-500">Sector</span>
                  <span class="font-semibold text-gray-900 flex items-center gap-1.5">
                    <span>{{ selectedCategoryObj.icon || '🏢' }}</span>
                    {{ selectedCategoryObj.name }}
                  </span>
                </div>
                <div v-if="selectedPlanObj" class="flex items-center justify-between">
                  <span class="text-gray-500">Plan</span>
                  <span class="font-semibold text-gray-900 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full" :style="{ background: selectedPlanObj.color || '#ef4444' }" />
                    {{ selectedPlanObj.name }}
                  </span>
                </div>
              </div>
            </div>
          </template>

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
import {
  BoltIcon, CheckIcon, CheckCircleIcon,
  ExclamationCircleIcon, ArrowRightIcon, LockClosedIcon,
} from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'

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
    } catch (e: any) { saveError.value = e?.data?.message ?? e.message }
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
      saveError.value = e?.data?.message ?? e.message ?? 'Error al guardar el plan. Intenta de nuevo.'
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

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
</style>
