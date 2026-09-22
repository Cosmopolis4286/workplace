<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-4">
      <div class="p-3 bg-gradient-to-br from-workplace-red to-red-700 rounded-xl shadow-lg mr-3">
        <UserGroupIcon class="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-gray-900">Mis perfiles</h3>
        <p class="text-xs text-gray-400">Distintas formas de usar WorkPlace, una sola cuenta</p>
      </div>
    </div>
    <p class="text-sm text-gray-500 mb-4">
      Activa distintos perfiles dentro de WorkPlace sin crear otra cuenta: cliente, profesional, candidato de empleo o negocio.
    </p>

    <div v-if="loading" class="space-y-2.5">
      <div v-for="i in 4" :key="i" class="h-16 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <div v-else class="space-y-2.5">
      <div
        v-for="type in PROFILE_TYPES"
        :key="type.value"
        class="rounded-xl border transition-colors duration-200"
        :class="[
          statusStyle(profileFor(type.value)?.status),
          activatingType === type.value ? 'ring-2 ring-offset-1' : '',
          activatingType === type.value ? type.ring : '',
        ]"
      >
        <div class="flex items-center justify-between gap-3 p-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" :class="type.iconBg">
              <component :is="type.icon" class="h-5 w-5" :class="type.iconColor" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-900">{{ type.label }}</p>
              <p class="text-xs text-gray-500 truncate">{{ type.description }}</p>
            </div>
          </div>

          <button
            v-if="!profileFor(type.value) || profileFor(type.value)?.status === 'REJECTED'"
            type="button"
            class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-100"
            :class="activatingType === type.value
              ? [type.solidBg, 'text-white border-transparent shadow-sm']
              : [type.outlineBorder, type.outlineText, type.outlineHoverBg, 'hover:text-white']"
            :disabled="activatingType === type.value"
            @click="startActivation(type.value)"
          >
            <span class="inline-flex items-center gap-1">
              <CheckIcon v-if="activatingType === type.value" class="h-3.5 w-3.5" />
              {{ activatingType === type.value ? 'Completando…' : (profileFor(type.value)?.status === 'REJECTED' ? 'Reintentar' : 'Activar') }}
            </span>
          </button>

          <div v-else class="flex items-center gap-2 shrink-0">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full" :class="statusBadge(profileFor(type.value)?.status)">
              <component :is="statusIcon(profileFor(type.value)?.status)" class="h-3.5 w-3.5" />
              {{ statusLabel(profileFor(type.value)?.status) }}
            </span>

            <button
              v-if="profileFor(type.value)?.status === 'ACTIVE'"
              type="button"
              :disabled="deactivatingId === profileFor(type.value)?.id"
              class="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              @click="confirmDeactivate(type)"
            >Desactivar</button>

            <button
              v-if="profileFor(type.value)?.status === 'SUSPENDED' && profileFor(type.value)?.suspendedBySelf"
              type="button"
              :disabled="reactivatingId === profileFor(type.value)?.id"
              class="px-2.5 py-1 text-xs font-semibold border rounded-lg transition-colors disabled:opacity-50"
              :class="[type.outlineBorder, type.outlineText, type.outlineHoverBg, 'hover:text-white']"
              @click="confirmReactivate(type)"
            >Reactivar</button>
          </div>
        </div>

        <div v-if="profileFor(type.value)?.status === 'REJECTED' && profileFor(type.value)?.rejectionReason" class="px-4 pb-3 -mt-1">
          <p class="text-xs text-red-700 bg-red-100/60 rounded-lg px-2.5 py-1.5">
            <span class="font-semibold">Motivo del rechazo:</span> {{ profileFor(type.value)?.rejectionReason }}
          </p>
        </div>

        <div v-if="profileFor(type.value)?.status === 'SUSPENDED' && !profileFor(type.value)?.suspendedBySelf" class="px-4 pb-3 -mt-1">
          <p class="text-xs text-gray-500 bg-gray-100/60 rounded-lg px-2.5 py-1.5">
            Este perfil fue suspendido por un administrador. Contacta a soporte para reactivarlo.
          </p>
        </div>

        <div v-if="profileFor(type.value)?.status === 'PENDING' && profileFor(type.value)?.pendingPlan" class="px-4 pb-3 -mt-1">
          <p class="text-xs text-amber-700 bg-amber-100/60 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5">
            <CreditCardIcon class="h-3.5 w-3.5 shrink-0" />
            Plan solicitado: <span class="font-semibold">{{ profileFor(type.value)?.pendingPlan?.name }}</span>
          </p>
        </div>

        <!-- Formulario (solo tipos que requieren categoría) -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <form v-if="activatingType === type.value" @submit.prevent="submit(type.value)" class="px-4 pb-4">
            <div class="border-t border-gray-100 pt-3.5 space-y-3">
              <template v-if="type.requiresCategory">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Categoría</label>
                  <select
                    v-model="form.categoryId"
                    class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white transition-colors"
                    required
                    @change="onCategoryChange"
                  >
                    <option value="" disabled>Selecciona una categoría</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.icon || '🏢' }} {{ cat.name }}</option>
                    <option :value="OTHER">✏️ Otro (no encuentro mi rubro)</option>
                  </select>
                </div>

                <Transition
                  enter-active-class="transition-all duration-150 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                >
                  <div v-if="form.categoryId === OTHER">
                    <label class="block text-xs font-semibold text-gray-700 mb-1.5">¿A qué se dedica?</label>
                    <textarea
                      v-model="form.otherCategoryText"
                      rows="2"
                      maxlength="200"
                      placeholder="Cuéntanos a qué se dedica, así lo agregamos al catálogo"
                      class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white transition-colors resize-none"
                      required
                    />
                    <p class="mt-1.5 text-xs text-gray-400">Un administrador revisará tu propuesta antes de activar el perfil.</p>
                  </div>
                </Transition>

                <div v-if="form.categoryId && form.categoryId !== OTHER && subcategories.length > 0">
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Subcategoría <span class="font-normal text-gray-400">(opcional)</span></label>
                  <select
                    v-model="form.subcategoryId"
                    class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white transition-colors"
                  >
                    <option value="">Sin subcategoría</option>
                    <option v-for="sub in subcategories" :key="sub.id" :value="sub.id">{{ sub.icon || '📄' }} {{ sub.name }}</option>
                    <option :value="OTHER">✏️ Otro (no encuentro mi subcategoría)</option>
                  </select>
                </div>

                <Transition
                  enter-active-class="transition-all duration-150 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                >
                  <div v-if="form.categoryId && form.categoryId !== OTHER && form.subcategoryId === OTHER">
                    <label class="block text-xs font-semibold text-gray-700 mb-1.5">Nombre de la subcategoría</label>
                    <input
                      v-model="form.otherSubcategoryText"
                      type="text"
                      maxlength="80"
                      placeholder="Ej. Máquinas de Coser"
                      class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white transition-colors"
                      required
                    />
                    <p class="mt-1.5 text-xs text-gray-400">Un administrador revisará tu propuesta antes de activar el perfil.</p>
                  </div>
                </Transition>

                <div v-if="type.value === 'PROFESSIONAL'">
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de profesional</label>
                  <select
                    v-model="form.subtype"
                    class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white transition-colors"
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
                    class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white transition-colors"
                    required
                  />
                </div>

                <div v-if="form.categoryId && form.categoryId !== OTHER">
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Plan <span class="font-normal text-gray-400">(opcional, puedes elegirlo después)</span></label>
                  <div v-if="loadingPlans" class="flex items-center gap-1.5 text-xs text-gray-400 py-2">
                    <span class="h-3 w-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    Cargando planes…
                  </div>
                  <select
                    v-else
                    v-model="form.planId"
                    class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white transition-colors"
                  >
                    <option value="">Sin plan por ahora</option>
                    <option v-for="plan in plansForType" :key="plan.id" :value="plan.id">
                      {{ plan.name }} — {{ plan.price === 0 ? 'Gratis' : `$${plan.price}/mes` }}
                    </option>
                  </select>
                </div>
              </template>

              <Transition
                enter-active-class="transition-all duration-150 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
              >
                <p v-if="submitError" class="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                  <ExclamationCircleIcon class="h-3.5 w-3.5 shrink-0" />{{ submitError }}
                </p>
              </Transition>

              <div class="flex items-center gap-2 pt-0.5">
                <button
                  type="submit"
                  :disabled="!canSubmit(type) || submitting"
                  class="px-4 py-2 bg-workplace-red hover:bg-red-700 disabled:hover:bg-workplace-red disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <span v-if="submitting" class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {{ submitting ? 'Enviando…' : type.requiresApproval ? 'Enviar solicitud' : 'Activar' }}
                </button>
                <button
                  type="button"
                  class="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  :disabled="submitting"
                  @click="cancelActivation"
                >Cancelar</button>
              </div>
            </div>
          </form>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  UserIcon, BriefcaseIcon, MagnifyingGlassIcon, BuildingStorefrontIcon, UserGroupIcon,
  CheckIcon, CheckCircleIcon, ClockIcon, PauseCircleIcon, CreditCardIcon, ExclamationCircleIcon,
} from '@heroicons/vue/24/outline'
import { useProfileActivations, type ProfileActivation, type ProfileActivationType, type ProfileActivationStatus } from '~/composables/users/useProfileActivations'
import { useProposedCategories } from '~/composables/admin/useProposedCategories'
import { useConfirm } from '~/composables/ui/useConfirm'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

const emit = defineEmits<{
  success: [message: string]
  error: [err: unknown]
}>()

// Sentinel para "Otro" — no es un id real, distingue la opción especial que
// propone una categoría/subcategoría nueva (mismo patrón que
// OnboardingSectorStep.vue, para consistencia entre los 3 puntos de entrada
// a profile-activations: onboarding, pricing y este).
const OTHER = '__OTHER__'

const { mine: profiles, fetchMine, create, deactivate, reactivate } = useProfileActivations()
const { propose } = useProposedCategories()
const { confirm } = useConfirm()
const { get: apiGet } = useApi()

const loading = ref(true)
const activatingType = ref<ProfileActivationType | null>(null)
const submitting = ref(false)
const submitError = ref('')
const deactivatingId = ref<string | null>(null)
const reactivatingId = ref<string | null>(null)
const categories = ref<{ id: string; name: string; icon?: string }[]>([])
const subcategories = ref<{ id: string; name: string; icon?: string }[]>([])
const plans = ref<{ id: string; name: string; price: number; forCommerce?: boolean; forFreelancer?: boolean }[]>([])
const loadingPlans = ref(false)
const form = ref({
  categoryId: '', subcategoryId: '', subtype: '', commerceName: '', planId: '',
  otherCategoryText: '', otherSubcategoryText: '',
})

// El plan mostrado depende del tipo de perfil que se está solicitando —
// mismo criterio de compatibilidad que valida ProfileActivationsService.create().
const plansForType = computed(() => {
  if (activatingType.value === 'BUSINESS') return plans.value.filter(p => p.forCommerce)
  if (activatingType.value === 'PROFESSIONAL') return plans.value.filter(p => p.forFreelancer)
  return []
})

// Un color de acento por tipo de perfil (icono + botón + anillo de foco al
// abrir su formulario) — antes todos compartían el mismo rojo de marca y era
// difícil distinguir de un vistazo qué tarjeta estaba activa/expandida.
const PROFILE_TYPES: Array<{
  value: ProfileActivationType
  label: string
  description: string
  icon: any
  requiresCategory: boolean
  requiresApproval: boolean
  iconBg: string
  iconColor: string
  outlineBorder: string
  outlineText: string
  outlineHoverBg: string
  solidBg: string
  ring: string
}> = [
  {
    value: 'CUSTOMER', label: 'Cliente', description: 'Comprar productos y contratar servicios.', icon: UserIcon,
    requiresCategory: false, requiresApproval: false,
    iconBg: 'bg-blue-50', iconColor: 'text-blue-500',
    outlineBorder: 'border-blue-300', outlineText: 'text-blue-600', outlineHoverBg: 'hover:bg-blue-500 hover:border-blue-500',
    solidBg: 'bg-blue-500', ring: 'ring-blue-300',
  },
  {
    value: 'PROFESSIONAL', label: 'Profesional', description: 'Ofrecer servicios como freelancer o proveedor.', icon: BriefcaseIcon,
    requiresCategory: true, requiresApproval: true,
    iconBg: 'bg-violet-50', iconColor: 'text-violet-500',
    outlineBorder: 'border-violet-300', outlineText: 'text-violet-600', outlineHoverBg: 'hover:bg-violet-500 hover:border-violet-500',
    solidBg: 'bg-violet-500', ring: 'ring-violet-300',
  },
  {
    value: 'JOB_SEEKER', label: 'Candidato de empleo', description: 'Buscar y postular a ofertas de empleo.', icon: MagnifyingGlassIcon,
    requiresCategory: false, requiresApproval: false,
    iconBg: 'bg-amber-50', iconColor: 'text-amber-500',
    outlineBorder: 'border-amber-300', outlineText: 'text-amber-600', outlineHoverBg: 'hover:bg-amber-500 hover:border-amber-500',
    solidBg: 'bg-amber-500', ring: 'ring-amber-300',
  },
  {
    value: 'BUSINESS', label: 'Negocio', description: 'Vender productos y gestionar un comercio.', icon: BuildingStorefrontIcon,
    requiresCategory: true, requiresApproval: true,
    iconBg: 'bg-red-50', iconColor: 'text-workplace-red',
    outlineBorder: 'border-workplace-red', outlineText: 'text-workplace-red', outlineHoverBg: 'hover:bg-workplace-red hover:border-workplace-red',
    solidBg: 'bg-workplace-red', ring: 'ring-red-300',
  },
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

function statusIcon(status?: ProfileActivationStatus) {
  if (status === 'PENDING') return ClockIcon
  if (status === 'ACTIVE') return CheckCircleIcon
  if (status === 'SUSPENDED') return PauseCircleIcon
  return CheckCircleIcon
}

function statusBadge(status?: ProfileActivationStatus) {
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700'
  if (status === 'ACTIVE') return 'bg-green-100 text-green-700'
  if (status === 'SUSPENDED') return 'bg-gray-200 text-gray-700'
  return ''
}

function statusStyle(status?: ProfileActivationStatus) {
  if (status === 'PENDING') return 'bg-amber-50/60 border-amber-100'
  if (status === 'ACTIVE') return 'bg-green-50/60 border-green-100'
  if (status === 'REJECTED') return 'bg-red-50/60 border-red-100'
  return 'bg-gray-50/60 border-gray-100 hover:border-gray-200'
}

async function loadCategories() {
  try {
    categories.value = await apiGet('/users/categories')
  } catch { /* no bloquea el resto del perfil */ }
}

async function onCategoryChange() {
  form.value.subcategoryId = ''
  form.value.otherSubcategoryText = ''
  form.value.planId = ''
  subcategories.value = []
  if (!form.value.categoryId || form.value.categoryId === OTHER) return
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
  form.value = { categoryId: '', subcategoryId: '', subtype: '', commerceName: '', planId: '', otherCategoryText: '', otherSubcategoryText: '' }
  plans.value = []
}

function cancelActivation() {
  activatingType.value = null
  submitError.value = ''
}

// Botón submit deshabilitado hasta que el formulario esté realmente
// completo — evita depender solo de las validaciones HTML `required`
// (invisibles cuando el campo condicional todavía no se montó).
function canSubmit(type: (typeof PROFILE_TYPES)[number]): boolean {
  if (!type.requiresCategory) return true
  if (!form.value.categoryId) return false
  if (form.value.categoryId === OTHER) return !!form.value.otherCategoryText.trim()
  if (form.value.subcategoryId === OTHER && !form.value.otherSubcategoryText.trim()) return false
  if (type.value === 'BUSINESS' && !form.value.commerceName.trim()) return false
  if (type.value === 'PROFESSIONAL' && !form.value.subtype) return false
  return true
}

async function submit(type: ProfileActivationType) {
  submitError.value = ''
  submitting.value = true
  try {
    if (form.value.categoryId === OTHER) {
      // Sin categoría real todavía no hay categoryId válido que mandarle a
      // profile-activations (lo exige para PROFESSIONAL/BUSINESS) — se
      // propone la categoría para revisión admin y se corta acá. El usuario
      // repite "Activar" una vez que la propuesta sea aprobada y la
      // categoría exista de verdad (mismo trade-off que onboarding.vue).
      await propose({ name: form.value.otherCategoryText.trim(), target: 'USER_CATEGORY' })
      activatingType.value = null
      emit('success', 'Propuesta enviada. Un administrador la revisará — vuelve a intentar activar este perfil cuando la aprueben.')
      return
    }

    if (form.value.subcategoryId === OTHER) {
      await propose({
        name: form.value.otherSubcategoryText.trim(),
        target: 'USER_CATEGORY',
        parentCategoryId: form.value.categoryId,
      })
    }

    await create({
      type,
      subtype: type === 'PROFESSIONAL' ? (form.value.subtype as any) : undefined,
      categoryId: form.value.categoryId || undefined,
      subcategoryId: form.value.subcategoryId && form.value.subcategoryId !== OTHER ? form.value.subcategoryId : undefined,
      commerceName: type === 'BUSINESS' ? form.value.commerceName.trim() : undefined,
      planId: form.value.planId || undefined,
      planInterval: form.value.planId ? 'MONTHLY' : undefined,
    })
    activatingType.value = null
    emit('success', 'Solicitud enviada correctamente.')
  } catch (e: any) {
    submitError.value = getApiErrorMessage(e, 'Error al activar el perfil')
    emit('error', e)
  } finally {
    submitting.value = false
  }
}

async function confirmDeactivate(type: (typeof PROFILE_TYPES)[number]) {
  const profile = profileFor(type.value)
  if (!profile) return
  const isBusinessRole = type.value === 'PROFESSIONAL' || type.value === 'BUSINESS'
  await confirm({
    title: `¿Desactivar ${type.label}?`,
    message: isBusinessRole
      ? `Dejarás de operar como ${type.label.toLowerCase()} en WorkPlace. Puedes reactivarlo cuando quieras.`
      : `Puedes reactivarlo cuando quieras.`,
    confirmText: 'Desactivar',
    variant: 'danger',
    onConfirm: async () => {
      deactivatingId.value = profile.id
      try {
        await deactivate(profile.id)
        emit('success', `${type.label} desactivado.`)
      } catch (e: any) {
        emit('error', e)
        return getApiErrorMessage(e, 'Error al desactivar el perfil')
      } finally {
        deactivatingId.value = null
      }
    },
  })
}

async function confirmReactivate(type: (typeof PROFILE_TYPES)[number]) {
  const profile = profileFor(type.value)
  if (!profile) return
  await confirm({
    title: `¿Reactivar ${type.label}?`,
    message: `Volverás a operar como ${type.label.toLowerCase()} con los mismos datos de antes.`,
    confirmText: 'Reactivar',
    variant: 'primary',
    onConfirm: async () => {
      reactivatingId.value = profile.id
      try {
        await reactivate(profile.id)
        emit('success', `${type.label} reactivado.`)
      } catch (e: any) {
        emit('error', e)
        return getApiErrorMessage(e, 'Error al reactivar el perfil')
      } finally {
        reactivatingId.value = null
      }
    },
  })
}

loadCategories()
fetchMine().finally(() => { loading.value = false })
</script>
