export interface LocationOption {
  name: string
  isoCode: string
}

// country-state-city embebe el catálogo completo de países/estados/ciudades
// del mundo (~8.7MB) — es, por lejos, el chunk más pesado del bundle. import()
// dinámico lo separa en su propio chunk que Vite solo descarga la primera vez
// que se abre un selector de ubicación, no en el bundle inicial.
let modPromise: ReturnType<typeof loadModule> | null = null
function loadModule() {
  return import('country-state-city')
}
function getModule() {
  if (!modPromise) modPromise = loadModule()
  return modPromise
}

export function useLocationData() {
  async function getCountries(): Promise<LocationOption[]> {
    const { Country } = await getModule()
    return Country.getAllCountries().map(c => ({ name: c.name, isoCode: c.isoCode }))
  }

  async function getStatesByCountry(countryIso: string): Promise<LocationOption[]> {
    if (!countryIso) return []
    const { State } = await getModule()
    return State.getStatesOfCountry(countryIso).map(s => ({ name: s.name, isoCode: s.isoCode }))
  }

  async function getCitiesByState(countryIso: string, stateIso: string): Promise<LocationOption[]> {
    if (!countryIso || !stateIso) return []
    const { City } = await getModule()
    return City.getCitiesOfState(countryIso, stateIso).map(c => ({ name: c.name, isoCode: c.name }))
  }

  async function findCountryByName(name: string) {
    const { Country } = await getModule()
    return Country.getAllCountries().find(c => c.name.toLowerCase() === name.toLowerCase()) ?? null
  }

  async function findStateByName(countryIso: string, name: string) {
    const { State } = await getModule()
    return State.getStatesOfCountry(countryIso).find(s => s.name.toLowerCase() === name.toLowerCase()) ?? null
  }

  return { getCountries, getStatesByCountry, getCitiesByState, findCountryByName, findStateByName }
}
