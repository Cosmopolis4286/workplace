import { Country, State, City } from 'country-state-city'

export interface LocationOption {
  name: string
  isoCode: string
}

export function useLocationData() {
  function getCountries(): LocationOption[] {
    return Country.getAllCountries().map(c => ({ name: c.name, isoCode: c.isoCode }))
  }

  function getStatesByCountry(countryIso: string): LocationOption[] {
    if (!countryIso) return []
    return State.getStatesOfCountry(countryIso).map(s => ({ name: s.name, isoCode: s.isoCode }))
  }

  function getCitiesByState(countryIso: string, stateIso: string): LocationOption[] {
    if (!countryIso || !stateIso) return []
    return City.getCitiesOfState(countryIso, stateIso).map(c => ({ name: c.name, isoCode: c.name }))
  }

  function findCountryByName(name: string) {
    return Country.getAllCountries().find(c => c.name.toLowerCase() === name.toLowerCase()) ?? null
  }

  function findStateByName(countryIso: string, name: string) {
    return State.getStatesOfCountry(countryIso).find(s => s.name.toLowerCase() === name.toLowerCase()) ?? null
  }

  return { getCountries, getStatesByCountry, getCitiesByState, findCountryByName, findStateByName }
}
