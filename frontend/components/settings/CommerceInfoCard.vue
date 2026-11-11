<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
        <BuildingStorefrontIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Información del Comercio</h3>
    </div>

    <div class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre del Comercio</label>
        <input v-model="form.name" type="text" class="input-field" placeholder="Mi Comercio">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Tipo de Establecimiento</label>
        <input v-model="form.type" type="text" class="input-field" placeholder="Restaurante, Tienda, Servicio...">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
        <input v-model="form.address" type="text" class="input-field" placeholder="Av. Principal 123, Col. Centro">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
          <input v-model="form.phone" type="tel" class="input-field" placeholder="+52 123 456 7890">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
          <input v-model="form.email" type="email" class="input-field" placeholder="contacto@micomercio.com">
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">País</label>
          <SearchableSelect
            v-model="form.country"
            :options="countryNames"
            placeholder="Ej: Venezuela"
            @update:model-value="onCountryChange"
          />
        </div>

        <!-- Venezuela: Estado → Municipio → Ciudad en cascada contra el catálogo VE -->
        <template v-if="isVenezuela">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
            <SearchableSelect
              v-model="form.state"
              :options="veStates"
              placeholder="Selecciona un estado"
              @update:model-value="onStateChange"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Municipio</label>
            <SearchableSelect
              v-model="form.municipality"
              :options="veMunicipios.map(m => m.name)"
              :disabled="!form.state"
              placeholder="Selecciona un municipio"
              @update:model-value="onMunicipalityChange"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
            <SearchableSelect
              v-model="form.city"
              :options="veCiudades.map(c => c.name)"
              :disabled="!form.municipality"
              placeholder="Selecciona una ciudad"
              @update:model-value="onCityChange"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Parroquia <span class="text-gray-400 font-normal">(opcional)</span>
            </label>
            <SearchableSelect
              v-model="form.parish"
              :options="veParroquias.map(p => p.name)"
              :disabled="!form.city"
              placeholder="Selecciona una parroquia"
            />
          </div>
        </template>
        <template v-else>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Estado / Provincia</label>
            <input v-model="form.state" type="text" class="input-field" placeholder="Ej: Miranda">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
            <input v-model="form.city" type="text" class="input-field" placeholder="Ej: Caracas">
          </div>
        </template>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Horario de Atención</label>
        <textarea
          v-model="form.schedule"
          rows="3"
          class="input-field resize-none"
          placeholder="Lunes a Viernes: 9:00 - 22:00&#10;Sábados y Domingos: 10:00 - 23:00"
        />
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Descripción <span class="text-gray-400 font-normal">(visible en tu tienda pública)</span>
        </label>
        <textarea
          v-model="form.description"
          rows="3"
          maxlength="500"
          class="input-field resize-none"
          placeholder="Cuéntale a tus clientes de qué trata tu negocio..."
        />
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Redes sociales</label>
        <div class="grid grid-cols-2 gap-4">
          <input v-model="form.socialLinks.instagram" type="text" class="input-field" placeholder="Instagram">
          <input v-model="form.socialLinks.facebook" type="text" class="input-field" placeholder="Facebook">
          <input v-model="form.socialLinks.whatsapp" type="text" class="input-field" placeholder="WhatsApp">
          <input v-model="form.socialLinks.tiktok" type="text" class="input-field" placeholder="TikTok">
        </div>
      </div>

      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <p class="text-sm font-semibold text-gray-700">Tienda pública visible</p>
          <p class="text-xs text-gray-500">Si la desactivas, tu página /loja dejará de mostrarse a clientes</p>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="form.isPublic"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          :class="form.isPublic ? 'bg-blue-600' : 'bg-gray-300'"
          @click="form.isPublic = !form.isPublic"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="form.isPublic ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <p class="text-sm font-semibold text-gray-700">Mostrar teléfono, correo y WhatsApp en tu tienda</p>
          <p class="text-xs text-gray-500">
            Si lo desactivas, tus clientes te escriben por el chat de cada pedido.
            La plataforma también puede ocultarlo para todas las tiendas.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="form.showPublicContact"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
          :class="form.showPublicContact ? 'bg-blue-600' : 'bg-gray-300'"
          @click="form.showPublicContact = !form.showPublicContact"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="form.showPublicContact ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <button :disabled="saving" class="btn-save btn-blue" @click="$emit('save', { ...form })">
        <span v-if="saving" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Guardando...
        </span>
        <span v-else>Guardar Información</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { BuildingStorefrontIcon } from '@heroicons/vue/24/outline'
import SearchableSelect from '~/components/ui/SearchableSelect.vue'
import { useVeLocations, type VeMunicipio, type VeCiudad } from '~/composables/location/useVeLocations'
import { useLocationData } from '~/composables/location/useLocationData'
import type { CommerceInfo, SocialLinks } from '~/composables/commerce/useSettings'

export interface CommerceInfoForm {
  name: string
  type: string
  address: string
  phone: string
  email: string
  schedule: string
  country: string
  state: string
  city: string
  municipality: string
  parish: string
  description: string
  isPublic: boolean
  showPublicContact: boolean
  socialLinks: SocialLinks
}

const props = defineProps<{
  commerce: CommerceInfo | null
  saving: boolean
}>()

defineEmits<{
  save: [form: CommerceInfoForm]
}>()

function emptyForm(): CommerceInfoForm {
  return {
    name: '', type: '', address: '', phone: '', email: '', schedule: '',
    country: '', state: '', city: '', municipality: '', parish: '',
    description: '', isPublic: true, showPublicContact: true, socialLinks: {},
  }
}

const form = ref<CommerceInfoForm>(emptyForm())

watch(() => props.commerce, (commerce) => {
  if (!commerce) return
  form.value = {
    name: commerce.name ?? '',
    type: commerce.type ?? '',
    address: commerce.address ?? '',
    phone: commerce.phone ?? '',
    email: commerce.email ?? '',
    schedule: commerce.schedule ?? '',
    country: commerce.country ?? '',
    state: commerce.state ?? '',
    city: commerce.city ?? '',
    municipality: commerce.municipality ?? '',
    parish: commerce.parish ?? '',
    description: commerce.description ?? '',
    isPublic: commerce.isPublic ?? true,
    showPublicContact: commerce.showPublicContact ?? true,
    socialLinks: { ...(commerce.socialLinks ?? {}) },
  }
}, { immediate: true })

// ─── Ubicación: catálogo VE en cascada Estado→Municipio→Ciudad→Parroquia ─────
const { getCountries } = useLocationData()
const { getStates: getVeStates, getMunicipios: getVeMunicipios, getCiudades: getVeCiudades, getParroquias: getVeParroquias } = useVeLocations()

const countryNames = ref<string[]>([])
const isVenezuela = computed(() => form.value.country.trim().toLowerCase() === 'venezuela')

const veStates = ref<string[]>([])
const veMunicipios = ref<VeMunicipio[]>([])
const veCiudades = ref<VeCiudad[]>([])
const veParroquias = ref<{ id: string; name: string; postalCode: string | null }[]>([])

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

function onCountryChange() {
  if (!isVenezuela.value) return
  form.value.state = ''
  form.value.municipality = ''
  form.value.city = ''
  form.value.parish = ''
}

function onStateChange() {
  form.value.municipality = ''
  form.value.city = ''
  form.value.parish = ''
}

function onMunicipalityChange() {
  form.value.city = ''
  form.value.parish = ''
}

function onCityChange() {
  form.value.parish = ''
}

watch(isVenezuela, (isVe) => {
  if (isVe && veStates.value.length === 0) {
    getVeStates().then((s) => { veStates.value = s })
  }
}, { immediate: true })

watch(() => form.value.state, (state) => {
  if (isVenezuela.value && state) loadVeMunicipios(state)
})

watch(() => form.value.municipality, (municipality) => {
  if (isVenezuela.value && municipality) loadVeCiudades(municipality)
})

watch(() => form.value.city, (city) => {
  if (isVenezuela.value && city) loadVeParroquias(city)
})

getCountries().then((countries) => { countryNames.value = countries.map((c) => c.name) })
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white;
}
.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}
.btn-blue { @apply bg-gradient-to-r from-blue-500 to-blue-600; }
</style>
