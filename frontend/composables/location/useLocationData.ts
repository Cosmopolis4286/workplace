import { COUNTRIES } from './countries.data'
import { useVeLocations } from './useVeLocations'

export interface LocationOption {
  name: string
  isoCode: string
}

export const VENEZUELA_ISO = 'VE'

/**
 * Países, estados y ciudades para los selectores de ubicación.
 *
 * Antes cargaba `country-state-city` (~8,7 MB con todas las ciudades del
 * mundo), que la PWA no podía guardar en caché: con datos lentos se
 * descargaba cada vez. Ahora los países son una lista fija (~6 KB) y los
 * estados y ciudades de Venezuela salen del catálogo propio (/locations/ve),
 * el mismo que usan perfiles y comercios para guardar su ubicación, así que
 * el filtro del buscador compara nombres que sí coinciden. Para otros
 * países solo se elige el país.
 */
export function useLocationData() {
  const ve = useVeLocations()

  async function getCountries(): Promise<LocationOption[]> {
    return COUNTRIES.map(([isoCode, name]) => ({ name, isoCode }))
  }

  /** Estados del país (solo Venezuela; isoCode = nombre del estado). */
  async function getStatesByCountry(countryIso: string): Promise<LocationOption[]> {
    if (countryIso !== VENEZUELA_ISO) return []
    const states = await ve.getStates()
    return states.map(name => ({ name, isoCode: name }))
  }

  /** Municipios de un estado venezolano (isoCode = id del municipio). */
  async function getMunicipiosByState(state: string): Promise<LocationOption[]> {
    if (!state) return []
    const municipios = await ve.getMunicipios(state)
    return municipios.map(m => ({ name: m.name, isoCode: m.id }))
  }

  /** Ciudades de un municipio venezolano (isoCode = nombre de la ciudad). */
  async function getCitiesByMunicipio(municipioId: string): Promise<LocationOption[]> {
    if (!municipioId) return []
    const ciudades = await ve.getCiudades(municipioId)
    return ciudades.map(c => ({ name: c.name, isoCode: c.name }))
  }

  async function findCountryByName(name: string) {
    const match = COUNTRIES.find(([, n]) => n.toLowerCase() === name.toLowerCase())
    return match ? { isoCode: match[0], name: match[1] } : null
  }

  async function findStateByName(countryIso: string, name: string) {
    const states = await getStatesByCountry(countryIso)
    return states.find(s => s.name.toLowerCase() === name.toLowerCase()) ?? null
  }

  return {
    getCountries,
    getStatesByCountry,
    getMunicipiosByState,
    getCitiesByMunicipio,
    findCountryByName,
    findStateByName,
  }
}
