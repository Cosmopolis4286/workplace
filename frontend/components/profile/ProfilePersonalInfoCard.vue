<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
        <UserCircleIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Información Personal</h3>
    </div>

    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
          <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
            {{ profileForm.firstName || '—' }}
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Apellido</label>
          <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
            {{ profileForm.lastName || '—' }}
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
          <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
            {{ profileForm.email || '—' }}
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
          <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
            {{ profileForm.phone || '—' }}
          </div>
        </div>
      </div>

      <!-- Ubicación — todos los usuarios -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">País</label>
          <SearchableSelect
            v-model="profileForm.country"
            :options="countryNames"
            placeholder="Ej: Venezuela"
            @update:model-value="onProfileCountryChange"
          />
        </div>

        <!-- Venezuela: Estado → Municipio → Ciudad en cascada contra el catálogo VE -->
        <template v-if="isVenezuelaProfile">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
            <SearchableSelect
              v-model="profileForm.state"
              :options="veStates"
              placeholder="Selecciona un estado"
              @update:model-value="onProfileStateChange"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Municipio</label>
            <SearchableSelect
              v-model="profileForm.municipality"
              :options="veMunicipios.map(m => m.name)"
              :disabled="!profileForm.state"
              placeholder="Selecciona un municipio"
              @update:model-value="onProfileMunicipalityChange"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
            <SearchableSelect
              v-model="profileForm.city"
              :options="veCiudades.map(c => c.name)"
              :disabled="!profileForm.municipality"
              placeholder="Selecciona una ciudad"
              @update:model-value="onProfileCityChange"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Parroquia <span class="text-gray-400 font-normal">(opcional)</span>
            </label>
            <SearchableSelect
              v-model="profileForm.parish"
              :options="veParroquias.map(p => p.name)"
              :disabled="!profileForm.city"
              placeholder="Selecciona una parroquia"
            />
            <p v-if="selectedParishPostalCode" class="text-xs text-gray-400 mt-1">
              Código postal: {{ selectedParishPostalCode }}
            </p>
          </div>
        </template>

        <!-- Otro país: texto libre como antes -->
        <template v-else>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Estado / Provincia</label>
            <input
              v-model="profileForm.state"
              type="text"
              maxlength="100"
              placeholder="Ej: Miranda"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
            >
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
            <input
              v-model="profileForm.city"
              type="text"
              maxlength="100"
              placeholder="Ej: Caracas"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
            >
          </div>
        </template>
      </div>

      <!-- Categoría y Subcategoría — solo COMMERCE y FREELANCER -->
      <div v-if="isCommerceOrFreelancer" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Categoría
            <span class="ml-1 text-xs font-normal text-gray-400">(afecta los módulos disponibles)</span>
          </label>
          <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
            {{ categoryName || 'Sin categoría' }}
          </div>
        </div>

        <div v-if="subcategoryName">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Subcategoría
          </label>
          <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
            {{ subcategoryName }}
          </div>
        </div>
      </div>

      <!-- Username — solo COMMERCE y FREELANCER -->
      <div v-if="isCommerce || user?.role === 'FREELANCER'">
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Nombre de usuario
          <span class="ml-1 text-xs font-normal text-gray-400">(visible públicamente)</span>
        </label>

        <!-- Locked: cooldown active -->
        <div v-if="usernameIsLocked" class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">@</span>
          <input
            :value="profileForm.username"
            type="text"
            disabled
            class="w-full pl-8 pr-10 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
          >
          <span class="absolute right-3 top-1/2 -translate-y-1/2">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </span>
        </div>
        <p v-if="usernameIsLocked" class="mt-1.5 text-xs text-amber-600">
          Podrás cambiar tu nombre de usuario en {{ usernameDaysLeft }} día{{ usernameDaysLeft !== 1 ? 's' : '' }} (cada 30 días)
        </p>

        <!-- Unlocked: editable -->
        <div v-else class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">@</span>
          <input
            v-model="profileForm.username"
            type="text"
            maxlength="30"
            class="w-full pl-8 pr-10 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300"
            :class="{
              'border-gray-200 focus:ring-workplace-red/20 focus:border-workplace-red': usernameStatus === 'idle' || usernameStatus === 'checking',
              'border-green-400 focus:ring-green-100 focus:border-green-500': usernameStatus === 'available',
              'border-red-400 focus:ring-red-100 focus:border-red-500': usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown',
            }"
            placeholder="mi.usuario"
            autocomplete="username"
            @input="onUsernameInput(($event.target as HTMLInputElement).value)"
          >
          <!-- Status icon -->
          <span class="absolute right-3 top-1/2 -translate-y-1/2">
            <svg v-if="usernameStatus === 'checking'" class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <svg v-else-if="usernameStatus === 'available'" class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else-if="usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown'" class="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </div>
        <!-- Hint / error message (only when unlocked) -->
        <p v-if="!usernameIsLocked" class="mt-1.5 text-xs" :class="{
          'text-gray-400': usernameStatus === 'idle' || usernameStatus === 'checking',
          'text-green-600': usernameStatus === 'available',
          'text-red-500': usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown',
        }">
          <span v-if="usernameStatus === 'idle'">Solo letras minúsculas, números, puntos, guiones y guiones bajos</span>
          <span v-else-if="usernameStatus === 'checking'">Verificando disponibilidad...</span>
          <span v-else-if="usernameStatus === 'available'">¡Disponible!</span>
          <span v-else-if="usernameStatus === 'taken'">Este nombre de usuario ya está en uso</span>
          <span v-else-if="usernameStatus === 'invalid'">Solo se permiten letras minúsculas, números, puntos, guiones y guiones bajos</span>
          <span v-else-if="usernameStatus === 'cooldown'">Solo puedes cambiar el nombre de usuario cada 30 días. Faltan {{ usernameCooldownDaysLeft }} día{{ usernameCooldownDaysLeft !== 1 ? 's' : '' }}</span>
        </p>
      </div>

      <!-- Save Profile Button -->
      <div class="pt-4 border-t border-gray-100">
        <div class="flex items-center justify-between">
          <p v-if="profileDirty" class="text-sm text-gray-500">
            <span class="inline-flex items-center gap-1.5">
              <svg class="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              Tienes cambios sin guardar
            </span>
          </p>
          <p v-else class="text-sm text-gray-400">Sin cambios pendientes</p>
          <button
            type="button"
            @click="saveProfile"
            :disabled="!profileDirty || savingProfile || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown'"
            class="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="savingProfile" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ savingProfile ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UserCircleIcon } from '@heroicons/vue/24/outline'
import SearchableSelect from '~/components/ui/SearchableSelect.vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useVeLocations, type VeMunicipio, type VeCiudad } from '~/composables/location/useVeLocations'
import { useLocationData } from '~/composables/location/useLocationData'

const emit = defineEmits<{
  success: [message: string]
  error: [err: unknown]
}>()

const auth = useAuth()
const { checkUsername } = auth
const { confirm } = useConfirm()

const user = computed(() => auth.user.value)
const isCommerce = computed(() => user.value?.role === 'COMMERCE')
const isCommerceOrFreelancer = computed(() => ['COMMERCE', 'FREELANCER'].includes(user.value?.role ?? ''))

// ─── Categorías (solo lectura, para mostrar nombre) ──────────────────────────
const categories = ref<{ id: string; name: string; icon: string }[]>([])
const subcategories = ref<{ id: string; name: string; categoryId: string }[]>([])

async function fetchCategories() {
  if (!isCommerceOrFreelancer.value) return
  try {
    const { get } = useApi()
    categories.value = await get<typeof categories.value>('/users/categories')
  } catch { /* ignore */ }
}

async function fetchSubcategories() {
  if (!isCommerceOrFreelancer.value) return
  try {
    const { get } = useApi()
    subcategories.value = await get<typeof subcategories.value>('/users/subcategories')
  } catch { /* ignore */ }
}

const categoryName = computed(() => {
  const u = user.value as any
  if (!u?.categoryId) return ''
  const category = categories.value.find(cat => cat.id === u.categoryId)
  return category ? `${category.icon} ${category.name}` : ''
})

const subcategoryName = computed(() => {
  const u = user.value as any
  if (!u?.subcategoryId) return ''
  const subcategory = subcategories.value.find(sub => sub.id === u.subcategoryId)
  return subcategory ? subcategory.name : ''
})

// ─── Form ─────────────────────────────────────────────────────────────────────
const profileForm = ref({ firstName: '', lastName: '', email: '', phone: '', username: '', categoryId: '', country: '', state: '', city: '', municipality: '', parish: '' })
const savingProfile = ref(false)

function syncFormFromUser() {
  const u = user.value
  if (!u) return
  profileForm.value = {
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    username: u.username ?? '',
    categoryId: (u as any).categoryId ?? '',
    country: u.country ?? '',
    state: u.state ?? '',
    city: u.city ?? '',
    municipality: u.municipality ?? '',
    parish: u.parish ?? '',
  }
  usernameStatus.value = 'idle'
}

const profileDirty = computed(() => {
  const u = user.value
  if (!u) return false
  return (
    profileForm.value.firstName !== (u.firstName ?? '') ||
    profileForm.value.lastName !== (u.lastName ?? '') ||
    profileForm.value.email !== (u.email ?? '') ||
    profileForm.value.phone !== (u.phone ?? '') ||
    profileForm.value.username !== (u.username ?? '') ||
    profileForm.value.categoryId !== ((u as any).categoryId ?? '') ||
    profileForm.value.country !== (u.country ?? '') ||
    profileForm.value.state !== (u.state ?? '') ||
    profileForm.value.city !== (u.city ?? '') ||
    profileForm.value.municipality !== (u.municipality ?? '') ||
    profileForm.value.parish !== (u.parish ?? '')
  )
})

// ─── Ubicación: catálogo VE en cascada Estado→Municipio→Ciudad→Parroquia ─────
const { getCountries } = useLocationData()
const { getStates: getVeStates, getMunicipios: getVeMunicipios, getCiudades: getVeCiudades, getParroquias: getVeParroquias } = useVeLocations()

const countryNames = ref<string[]>([])
const isVenezuelaProfile = computed(() => profileForm.value.country.trim().toLowerCase() === 'venezuela')

const veStates = ref<string[]>([])
const veMunicipios = ref<VeMunicipio[]>([])
const veCiudades = ref<VeCiudad[]>([])
const veParroquias = ref<{ id: string; name: string; postalCode: string | null }[]>([])

const selectedParishPostalCode = computed(() => {
  const p = veParroquias.value.find((p) => p.name === profileForm.value.parish)
  return p?.postalCode ?? null
})

async function loadVeMunicipios(state: string) {
  veMunicipios.value = state ? await getVeMunicipios(state) : []
}

async function loadVeCiudades(municipioName: string) {
  veCiudades.value = []
  const municipio = veMunicipios.value.find((m) => m.name === municipioName)
  if (municipio) veCiudades.value = await getVeCiudades(municipio.id)
}

async function loadVeParroquias(ciudadName: string) {
  veParroquias.value = []
  const ciudad = veCiudades.value.find((c) => c.name === ciudadName)
  if (ciudad) veParroquias.value = await getVeParroquias(ciudad.id)
}

function onProfileCountryChange() {
  if (!isVenezuelaProfile.value) return
  profileForm.value.state = ''
  profileForm.value.municipality = ''
  profileForm.value.city = ''
  profileForm.value.parish = ''
}

function onProfileStateChange() {
  profileForm.value.municipality = ''
  profileForm.value.city = ''
  profileForm.value.parish = ''
}

function onProfileMunicipalityChange() {
  profileForm.value.city = ''
  profileForm.value.parish = ''
}

function onProfileCityChange() {
  profileForm.value.parish = ''
}

watch(isVenezuelaProfile, (isVe) => {
  if (isVe && veStates.value.length === 0) {
    getVeStates().then((s) => { veStates.value = s })
  }
}, { immediate: true })

watch(() => profileForm.value.state, (state) => {
  if (isVenezuelaProfile.value && state) loadVeMunicipios(state)
})

watch(() => profileForm.value.municipality, (municipality) => {
  if (isVenezuelaProfile.value && municipality) loadVeCiudades(municipality)
})

watch(() => profileForm.value.city, (city) => {
  if (isVenezuelaProfile.value && city) loadVeParroquias(city)
})

// ─── Username availability check ──────────────────────────────────────────────
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'cooldown'
const usernameStatus = ref<UsernameStatus>('idle')
const usernameCooldownDaysLeft = ref(0)
let usernameDebounce: ReturnType<typeof setTimeout> | null = null

const USERNAME_REGEX = /^[a-z0-9_.-]+$/
const USERNAME_COOLDOWN_DAYS = 30

const usernameIsLocked = computed(() => {
  const u = user.value
  if (!u?.usernameUpdatedAt) return false
  const daysSince = (Date.now() - new Date(u.usernameUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince < USERNAME_COOLDOWN_DAYS
})

const usernameDaysLeft = computed(() => {
  const u = user.value
  if (!u?.usernameUpdatedAt) return 0
  const daysSince = (Date.now() - new Date(u.usernameUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince)
})

function onUsernameInput(val: string) {
  usernameStatus.value = 'idle'
  if (usernameDebounce) clearTimeout(usernameDebounce)
  if (!val || val.length < 3) return
  if (!USERNAME_REGEX.test(val)) {
    usernameStatus.value = 'invalid'
    return
  }
  // If same as current username, no check needed
  if (val === (user.value?.username ?? '')) {
    usernameStatus.value = 'idle'
    return
  }
  usernameStatus.value = 'checking'
  usernameDebounce = setTimeout(async () => {
    try {
      const res = await checkUsername(val)
      if (!res.canChange) {
        usernameStatus.value = 'cooldown'
        usernameCooldownDaysLeft.value = res.daysLeft
      } else {
        usernameStatus.value = res.available ? 'available' : 'taken'
      }
    } catch {
      usernameStatus.value = 'idle'
    }
  }, 500)
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function saveProfile() {
  if (!profileDirty.value) return
  if (usernameStatus.value === 'taken') return
  if (usernameStatus.value === 'invalid') return
  if (usernameStatus.value === 'cooldown') return

  const usernameChanging = profileForm.value.username !== (user.value?.username ?? '')

  if (usernameChanging && profileForm.value.username) {
    const ok = await confirm({
      title: '¿Confirmas el cambio?',
      message: `Estás a punto de establecer @${profileForm.value.username} como tu nombre de usuario. Podrás volver a cambiarlo en 30 días.`,
      confirmText: 'Sí, cambiar',
      variant: 'danger',
    })
    if (!ok) return
  }

  savingProfile.value = true
  try {
    await auth.saveProfile({
      firstName: profileForm.value.firstName,
      lastName: profileForm.value.lastName,
      email: profileForm.value.email,
      phone: profileForm.value.phone || undefined,
      username: profileForm.value.username || undefined,
      categoryId: profileForm.value.categoryId || undefined,
      country: profileForm.value.country || undefined,
      state: profileForm.value.state || undefined,
      city: profileForm.value.city || undefined,
      municipality: profileForm.value.municipality || undefined,
      parish: profileForm.value.parish || undefined,
    } as any)
    usernameStatus.value = 'idle'
    emit('success', 'Perfil actualizado correctamente')
  } catch (err) {
    emit('error', err)
  } finally {
    savingProfile.value = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
getCountries().then((countries) => { countryNames.value = countries.map((c) => c.name) })
fetchCategories()
fetchSubcategories()
syncFormFromUser()

watch(user, syncFormFromUser)
</script>
