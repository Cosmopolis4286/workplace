import { useApi } from './useApi'

export interface VeMunicipio {
  id: string
  name: string
}

export interface VeCiudad {
  id: string
  name: string
}

export interface VeParroquia {
  id: string
  name: string
  postalCode: string | null
}

// Lectura pública del catálogo de división territorial de Venezuela
// (Estado → Municipio → Ciudad → Parroquia). El nivel Estado lo resuelve
// useLocationData() (country-state-city); este composable solo cubre lo
// que es propio del catálogo VE.
export function useVeLocations() {
  const { get } = useApi()

  async function getStates(): Promise<string[]> {
    return get<string[]>('/locations/ve/states')
  }

  async function getMunicipios(state: string): Promise<VeMunicipio[]> {
    if (!state) return []
    return get<VeMunicipio[]>(`/locations/ve/municipios?state=${encodeURIComponent(state)}`)
  }

  async function getCiudades(municipioId: string): Promise<VeCiudad[]> {
    if (!municipioId) return []
    return get<VeCiudad[]>(`/locations/ve/ciudades?municipioId=${encodeURIComponent(municipioId)}`)
  }

  async function getParroquias(ciudadId: string): Promise<VeParroquia[]> {
    if (!ciudadId) return []
    return get<VeParroquia[]>(`/locations/ve/parroquias?ciudadId=${encodeURIComponent(ciudadId)}`)
  }

  return { getStates, getMunicipios, getCiudades, getParroquias }
}
