<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide">Zona</h3>
      <button
        v-if="hasProfileLocation"
        class="text-[11px] font-bold"
        :class="accentTextClass"
        @click="useMyLocation"
      >
        Usar mi ubicación
      </button>
    </div>

    <div class="space-y-2">
      <select
        v-model="countryIso"
        class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none bg-white text-gray-700"
        :class="accentFocusClass"
        @change="onCountryChange"
      >
        <option value="">País (todos)</option>
        <option v-for="c in countries" :key="c.isoCode" :value="c.isoCode">{{ c.name }}</option>
      </select>

      <select
        v-model="stateIso"
        class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none bg-white text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
        :class="accentFocusClass"
        :disabled="!countryIso || states.length === 0"
        @change="onStateChange"
      >
        <option value="">Estado/Provincia (todos)</option>
        <option v-for="s in states" :key="s.isoCode" :value="s.isoCode">{{ s.name }}</option>
      </select>

      <select
        v-model="cityName"
        class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none bg-white text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
        :class="accentFocusClass"
        :disabled="!stateIso || cities.length === 0"
      >
        <option value="">Ciudad (todas)</option>
        <option v-for="c in cities" :key="c.isoCode" :value="c.name">{{ c.name }}</option>
      </select>
    </div>

    <button
      class="w-full mt-2.5 text-xs font-bold py-2 rounded-xl transition-colors"
      :class="accentButtonClass"
      @click="apply"
    >
      Aplicar
    </button>
    <button
      v-if="modelCountry || modelState || modelCity"
      class="w-full mt-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-600 py-1"
      @click="clear"
    >
      Quitar filtro de zona
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLocationData, type LocationOption } from '~/composables/location/useLocationData'

type Accent = 'red' | 'blue' | 'emerald'

const props = withDefaults(defineProps<{
  modelCountry: string
  modelState: string
  modelCity: string
  accent?: Accent
}>(), {
  accent: 'red',
})

const emit = defineEmits<{
  apply: [country: string, state: string, city: string]
}>()

const { getCountries, getStatesByCountry, getCitiesByState, findCountryByName, findStateByName } = useLocationData()
const { user } = useAuth()

const countries = ref<LocationOption[]>([])
getCountries().then((c) => { countries.value = c })

const countryIso = ref('')
const stateIso = ref('')
const cityName = ref('')

async function syncFromProps() {
  if (props.modelCountry) {
    const c = await findCountryByName(props.modelCountry)
    countryIso.value = c?.isoCode ?? ''
  } else {
    countryIso.value = ''
  }
  if (props.modelState && countryIso.value) {
    const s = await findStateByName(countryIso.value, props.modelState)
    stateIso.value = s?.isoCode ?? ''
  } else {
    stateIso.value = ''
  }
  cityName.value = props.modelCity || ''
}
syncFromProps()
watch([() => props.modelCountry, () => props.modelState, () => props.modelCity], syncFromProps)

const states = ref<LocationOption[]>([])
const cities = ref<LocationOption[]>([])
watch(countryIso, async (iso) => {
  states.value = await getStatesByCountry(iso)
}, { immediate: true })
watch([countryIso, stateIso], async ([cIso, sIso]) => {
  cities.value = await getCitiesByState(cIso, sIso)
}, { immediate: true })

function onCountryChange() {
  stateIso.value = ''
  cityName.value = ''
}
function onStateChange() {
  cityName.value = ''
}

const hasProfileLocation = computed(() => !!(user.value?.city || user.value?.state || user.value?.country))

async function useMyLocation() {
  const u = user.value
  if (!u) return
  if (u.country) {
    const c = await findCountryByName(u.country)
    countryIso.value = c?.isoCode ?? ''
    // El watch de countryIso repuebla `states` de forma async — se espera
    // explícito acá en vez de confiar en el watch para que apply() ya vea
    // el estado correcto (findStateByName necesita el país resuelto).
    states.value = countryIso.value ? await getStatesByCountry(countryIso.value) : []
  }
  if (u.state && countryIso.value) {
    const s = await findStateByName(countryIso.value, u.state)
    stateIso.value = s?.isoCode ?? ''
  }
  cityName.value = u.city || ''
  apply()
}

function apply() {
  const countryObj = countries.value.find(c => c.isoCode === countryIso.value)
  const stateObj = states.value.find(s => s.isoCode === stateIso.value)
  emit('apply', countryObj?.name ?? '', stateObj?.name ?? '', cityName.value)
}

function clear() {
  countryIso.value = ''
  stateIso.value = ''
  cityName.value = ''
  emit('apply', '', '', '')
}

const accentFocusClass = computed<string>(() => ({
  red: 'focus:border-red-400',
  blue: 'focus:border-blue-400',
  emerald: 'focus:border-emerald-400',
} satisfies Record<Accent, string>)[props.accent as Accent])

const accentButtonClass = computed<string>(() => ({
  red: 'bg-red-50 text-red-600 hover:bg-red-100',
  blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
} satisfies Record<Accent, string>)[props.accent as Accent])

const accentTextClass = computed<string>(() => ({
  red: 'text-red-600 hover:text-red-700',
  blue: 'text-blue-600 hover:text-blue-700',
  emerald: 'text-emerald-600 hover:text-emerald-700',
} satisfies Record<Accent, string>)[props.accent as Accent])
</script>
