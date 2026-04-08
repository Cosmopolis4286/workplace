<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
    <div class="w-full max-w-lg">

      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-workplace-red rounded-2xl shadow-lg mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">¡Bienvenido!</h1>
        <p class="text-gray-500 mt-1 text-sm">Cuéntanos un poco sobre tu negocio para personalizar tu experiencia.</p>
      </div>

      <!-- Step indicator -->
      <div class="flex items-center gap-2 mb-6 justify-center">
        <template v-for="(label, i) in steps" :key="i">
          <div class="flex items-center gap-1.5">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              :class="i < step ? 'bg-workplace-red text-white' : i === step ? 'bg-workplace-red text-white ring-4 ring-workplace-red/20' : 'bg-gray-200 text-gray-400'"
            >
              <svg v-if="i < step" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="text-xs font-medium hidden sm:block" :class="i <= step ? 'text-gray-700' : 'text-gray-400'">{{ label }}</span>
          </div>
          <div v-if="i < steps.length - 1" class="flex-1 h-0.5 max-w-12 rounded-full" :class="i < step ? 'bg-workplace-red' : 'bg-gray-200'" />
        </template>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

        <!-- Step 0: Categoría -->
        <template v-if="step === 0">
          <h2 class="text-base font-semibold text-gray-800 mb-1">¿En qué sector está tu negocio?</h2>
          <p class="text-xs text-gray-500 mb-4">Esto define qué módulos estarán disponibles para ti.</p>
          
          <!-- Categories Select -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <div v-if="loadingCats" class="flex justify-center py-4">
              <div class="w-6 h-6 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
            </div>
            <div v-else class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
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

          <!-- Subcategories Select -->
          <div v-if="selectedCategory && subcategories.length > 0" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Subcategoría (opcional)</label>
            <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              <button
                v-for="sub in subcategories"
                :key="sub.id"
                type="button"
                @click="selectedSubcategory = sub.id"
                class="flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all hover:border-workplace-red/40"
                :class="selectedSubcategory === sub.id ? 'border-workplace-red bg-red-50' : 'border-gray-200'"
              >
                <span class="text-sm font-medium text-gray-700 leading-tight">{{ sub.name }}</span>
              </button>
            </div>
          </div>

          <p v-if="catError" class="text-xs text-red-500 mt-2">{{ catError }}</p>
        </template>

        <!-- Step 1: Plan -->
        <template v-if="step === 1">
          <h2 class="text-base font-semibold text-gray-800 mb-1">Elige tu plan</h2>
          <p class="text-xs text-gray-500 mb-4">Puedes cambiarlo en cualquier momento.</p>
          <div v-if="loadingPlans" class="flex justify-center py-8">
            <div class="w-6 h-6 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
          </div>
          <div v-else class="space-y-3 max-h-72 overflow-y-auto pr-1">
            <button
              v-for="plan in plans"
              :key="plan.id"
              type="button"
              @click="selectedPlan = plan.id"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all hover:border-indigo-400"
              :class="selectedPlan === plan.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'"
            >
              <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: plan.color }" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-sm text-gray-800">{{ plan.name }}</span>
                  <span v-if="plan.isPopular" class="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">Popular</span>
                </div>
                <p class="text-xs text-gray-500 truncate">{{ plan.description }}</p>
              </div>
              <span class="font-bold text-sm text-gray-800 flex-shrink-0">
                {{ plan.price === 0 ? 'Gratis' : `$${plan.price}/mes` }}
              </span>
            </button>
          </div>
        </template>

        <!-- Step 2: Listo -->
        <template v-if="step === 2">
          <div class="text-center py-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h2 class="text-lg font-bold text-gray-900 mb-1">¡Todo listo!</h2>
            <p class="text-sm text-gray-500">Tu cuenta está configurada. Ahora puedes empezar a usar tu panel.</p>
          </div>
        </template>

        <p v-if="saveError" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{{ saveError }}</p>

        <!-- Actions -->
        <div class="flex gap-3 mt-5">
          <button
            v-if="step === 0"
            type="button"
            @click="skipOnboarding"
            class="flex-1 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Omitir por ahora
          </button>
          <button
            v-if="step < 2"
            type="button"
            @click="next"
            :disabled="saving"
            class="flex-1 py-2.5 bg-workplace-red text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {{ saving ? 'Guardando...' : step === 1 ? 'Finalizar' : 'Continuar' }}
          </button>
          <button
            v-if="step === 2"
            type="button"
            @click="goToDashboard"
            class="flex-1 py-2.5 bg-workplace-red text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Ir al panel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })

const config = useRuntimeConfig()
const { user, getHeaders } = useAuth()
const { invalidate: invalidateModules } = useModules()

const step = ref(0)
const steps = ['Tu negocio', 'Tu plan', '¡Listo!']

const categories = ref<{ id: string; name: string; icon?: string }[]>([])
const subcategories = ref<{ id: string; name: string }[]>([])
const plans = ref<{ id: string; name: string; description?: string; price: number; color: string; isPopular: boolean }[]>([])
const selectedCategory = ref('')
const selectedSubcategory = ref('')
const selectedPlan = ref('')
const loadingCats = ref(false)
const loadingPlans = ref(false)
const saving = ref(false)
const catError = ref('')
const saveError = ref('')

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.public.apiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getHeaders(), ...(options.headers as Record<string, string> ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Error ${res.status}`)
  }
  return res.json()
}

async function loadCategories() {
  loadingCats.value = true
  try { categories.value = await apiFetch('/users/categories') }
  catch { /* silently ignore */ }
  finally { loadingCats.value = false }
}

async function loadSubcategories(categoryId: string) {
  if (!categoryId) {
    subcategories.value = []
    selectedSubcategory.value = ''
    return
  }
  try {
    subcategories.value = await apiFetch(`/users/categories/${categoryId}/subcategories`)
  } catch { /* silently ignore */ }
}

async function loadPlans() {
  loadingPlans.value = true
  try {
    const role = user.value?.role ?? 'COMMERCE'
    const categoryParam = selectedCategory.value ? `&categoryId=${selectedCategory.value}` : ''
    plans.value = await apiFetch(`/plans/public?role=${role}${categoryParam}`)
  } catch { /* silently ignore */ }
  finally { loadingPlans.value = false }
}

async function selectCategory(categoryId: string) {
  selectedCategory.value = categoryId
  selectedSubcategory.value = ''
  await loadSubcategories(categoryId)
}

async function next() {
  saveError.value = ''
  if (step.value === 0) {
    if (!selectedCategory.value) { catError.value = 'Selecciona una categoría'; return }
    catError.value = ''
    saving.value = true
    try {
      const updateData: any = { categoryId: selectedCategory.value }
      if (selectedSubcategory.value) {
        updateData.subcategoryId = selectedSubcategory.value
      }
      await apiFetch(`/users/${user.value!.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      })
      invalidateModules()
      await loadPlans()
      step.value++
    } catch (e: any) { saveError.value = e.message }
    finally { saving.value = false }
  } else if (step.value === 1) {
    saving.value = true
    try {
      if (selectedPlan.value) {
        await apiFetch('/plans/self-subscribe', {
          method: 'POST',
          body: JSON.stringify({ planId: selectedPlan.value, interval: 'MONTHLY' }),
        })
        invalidateModules()
      }
      step.value++
    } catch (e: any) { saveError.value = e.message }
    finally { saving.value = false }
  }
}

function goToDashboard() { navigateTo('/dashboard') }
function skipOnboarding() { navigateTo('/dashboard') }

onMounted(loadCategories)
</script>
