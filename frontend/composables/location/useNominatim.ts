/**
 * Composable para geocoding y sugerencias de direcciones
 * usando Nominatim (OpenStreetMap) — gratuito, sin API key
 */

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    suburb?: string
    city?: string
    state?: string
    country?: string
  }
}

export interface PlaceSuggestion {
  label: string
  lat: number
  lng: number
}

// Formato compacto para mostrar en el dropdown
function formatLabel(r: NominatimResult): string {
  const parts = r.display_name.split(', ')
  // Mostrar máximo 4 partes para no saturar
  return parts.slice(0, 4).join(', ')
}

async function fetchPlaces(
  query: string,
  onResults: (results: PlaceSuggestion[]) => void,
  countrycodes: string,
) {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '6',
      addressdetails: '1',
      countrycodes,
    })
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'Accept-Language': 'es' } }
    )
    if (!res.ok) return onResults([])
    const data: NominatimResult[] = await res.json()
    onResults(
      data.map(r => ({
        label: formatLabel(r),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }))
    )
  } catch {
    onResults([])
  }
}

const { debounced: debouncedFetchPlaces, cancel: cancelSearchPlaces } = useDebounce(fetchPlaces, 350)

export function useNominatim() {
  /**
   * Busca sugerencias de lugares a partir de texto libre.
   * Debounced internamente para no saturar la API de Nominatim.
   */
  function searchPlaces(
    query: string,
    onResults: (results: PlaceSuggestion[]) => void,
    countrycodes = 've,ar,co,mx,br,cl,pe,ec,bo,py,uy' // Latam por defecto
  ) {
    if (!query || query.length < 3) {
      cancelSearchPlaces()
      onResults([])
      return
    }
    debouncedFetchPlaces(query, onResults, countrycodes)
  }

  /**
   * Geocodifica coordenadas a dirección legible (reverse geocoding).
   */
  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1',
      })
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        { headers: { 'Accept-Language': 'es' } }
      )
      if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      const data: NominatimResult = await res.json()
      return formatLabel(data)
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  }

  /**
   * Obtiene la ubicación actual del navegador y la geocodifica.
   */
  /**
   * Geolocalización solo disponible en HTTPS o localhost.
   * En HTTP sobre IP local Chrome la bloquea silenciosamente.
   */
  function isGeoAvailable(): boolean {
    if (typeof window === 'undefined') return false
    const { protocol, hostname } = window.location
    return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1'
  }

  async function getCurrentLocation(): Promise<PlaceSuggestion> {
    return new Promise((resolve, reject) => {
      if (!isGeoAvailable()) {
        reject(new Error('La geolocalización requiere HTTPS. Accede por localhost:3000'))
        return
      }
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada en este navegador'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const label = await reverseGeocode(lat, lng)
          resolve({ label, lat, lng })
        },
        err => {
          const msgs: Record<number, string> = {
            1: 'Permiso de ubicación denegado',
            2: 'Ubicación no disponible',
            3: 'Tiempo de espera agotado',
          }
          reject(new Error(msgs[err.code] || 'Error obteniendo ubicación'))
        },
        { timeout: 10000, maximumAge: 60000 }
      )
    })
  }

  return { searchPlaces, reverseGeocode, getCurrentLocation, isGeoAvailable }
}
