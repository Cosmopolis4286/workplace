import { describe, it, expect } from 'vitest'
import { canAccessAction, getHeroConfig, type HasCapability } from '@/config/dashboard.config'

// Carlos (delivery@demo.com): PROFESIONAL / SERVICE_PROVIDER, rubro Transporte,
// sin Commerce. Su rubro trae 'corridas' y 'jobs', no 'employees'.
const professional: HasCapability = (c) => c === 'HAS_PROFESSIONAL_PROFILE'
const transportModules = new Set(['services', 'jobs', 'corridas', 'service_requests'])
const hasTransportModule = (m: string) => transportModules.has(m)
const canAll = () => true

describe('dashboard.config — profesional de delivery', () => {
  it('el hero es el de proveedor cuando /auth/me trae la capacidad', () => {
    expect(getHeroConfig('PROFESIONAL', professional).title).toBe('Panel de Proveedor')
  })

  it('sin capacidades cargadas cae al hero de cliente (por eso se pide /auth/me tras el login)', () => {
    expect(getHeroConfig('PROFESIONAL', () => false).title).toBe('Mi Dashboard')
  })

  it('ve el atajo de corridas si su rubro tiene el módulo', () => {
    expect(canAccessAction('rides', 'PROFESIONAL', professional, hasTransportModule, canAll)).toBe(true)
    expect(canAccessAction('rides', 'PROFESIONAL', professional, () => false, canAll)).toBe(false)
  })

  it('"Mis Empleos" exige el módulo employees, no solo jobs', () => {
    expect(canAccessAction('manageJobs', 'PROFESIONAL', professional, hasTransportModule, canAll)).toBe(false)
  })

  it('"Mis Empleos" exige además el permiso employees:view', () => {
    const withEmployees = (m: string) => m === 'employees'
    expect(canAccessAction('manageJobs', 'PROFESIONAL', professional, withEmployees, () => false)).toBe(false)
    expect(canAccessAction('manageJobs', 'PROFESIONAL', professional, withEmployees, canAll)).toBe(true)
  })
})
