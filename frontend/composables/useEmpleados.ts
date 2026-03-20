import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export type EmployeeRole = 'GERENTE' | 'SUPERVISOR' | 'COCINERO' | 'MESERO' | 'CAJERO' | 'REPARTIDOR' | 'LIMPIEZA' | 'SEGURIDAD' | 'OTRO'
export type EmployeeStatus = 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'LICENCIA' | 'SUSPENDIDO'

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  role: EmployeeRole
  status: EmployeeStatus
  salary?: number
  hireDate?: string
  birthDate?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
  isActive: boolean
  commerceId: string
  createdAt: string
  updatedAt: string
}

export interface EmployeeStats {
  total: number
  active: number
  byRole: Partial<Record<EmployeeRole, number>>
}

export interface CreateEmployeePayload {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  role?: EmployeeRole
  status?: EmployeeStatus
  salary?: number
  hireDate?: string
  birthDate?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {
  isActive?: boolean
}

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  GERENTE: 'Gerente',
  SUPERVISOR: 'Supervisor',
  COCINERO: 'Cocinero',
  MESERO: 'Mesero',
  CAJERO: 'Cajero',
  REPARTIDOR: 'Repartidor',
  LIMPIEZA: 'Limpieza',
  SEGURIDAD: 'Seguridad',
  OTRO: 'Otro',
}

export const EMPLOYEE_ROLE_CLASSES: Record<EmployeeRole, string> = {
  GERENTE: 'bg-purple-100 text-purple-800',
  SUPERVISOR: 'bg-blue-100 text-blue-800',
  COCINERO: 'bg-orange-100 text-orange-800',
  MESERO: 'bg-green-100 text-green-800',
  CAJERO: 'bg-teal-100 text-teal-800',
  REPARTIDOR: 'bg-yellow-100 text-yellow-800',
  LIMPIEZA: 'bg-gray-100 text-gray-700',
  SEGURIDAD: 'bg-red-100 text-red-800',
  OTRO: 'bg-slate-100 text-slate-700',
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  VACACIONES: 'Vacaciones',
  LICENCIA: 'Licencia',
  SUSPENDIDO: 'Suspendido',
}

export const EMPLOYEE_STATUS_CLASSES: Record<EmployeeStatus, string> = {
  ACTIVO: 'bg-green-100 text-green-800',
  INACTIVO: 'bg-gray-100 text-gray-700',
  VACACIONES: 'bg-blue-100 text-blue-800',
  LICENCIA: 'bg-yellow-100 text-yellow-800',
  SUSPENDIDO: 'bg-red-100 text-red-800',
}

// Estado global compartido
const employees = ref<Employee[]>([])
const stats = ref<EmployeeStats>({ total: 0, active: 0, byRole: {} })
const loading = ref(false)
const error = ref<string | null>(null)

export const useEmpleados = () => {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const totalEmployees = computed(() => employees.value.length)
  const activeEmployees = computed(() => employees.value.filter((e) => e.isActive).length)
  const managerCount = computed(() =>
    employees.value.filter((e) => e.role === 'GERENTE' || e.role === 'SUPERVISOR').length,
  )

  // ─── API helper ────────────────────────────────────────────────────────────

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
    return $fetch<T>(`${apiUrl}/employees${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
  }

  async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number })?.status
        ?? (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          router.push('/login')
          throw err
        }
        return await fn()
      }
      throw err
    }
  }

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function loadEmpleados() {
    loading.value = true
    error.value = null
    try {
      const [data, statsData] = await withAuthRetry(() =>
        Promise.all([
          apiFetch<Employee[]>(''),
          apiFetch<EmployeeStats>('/stats'),
        ]),
      )
      employees.value = data
      stats.value = statsData
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cargar los empleados'
    } finally {
      loading.value = false
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async function createEmpleado(payload: CreateEmployeePayload): Promise<Employee | null> {
    try {
      const employee = await withAuthRetry(() =>
        apiFetch<Employee>('', { method: 'POST', body: JSON.stringify(payload) }),
      )
      employees.value.push(employee)
      stats.value.total++
      if (employee.isActive) stats.value.active++
      return employee
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al crear el empleado'
      return null
    }
  }

  async function updateEmpleado(id: string, payload: UpdateEmployeePayload): Promise<Employee | null> {
    try {
      const employee = await withAuthRetry(() =>
        apiFetch<Employee>(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      )
      const idx = employees.value.findIndex((e) => e.id === id)
      if (idx !== -1) employees.value[idx] = employee
      return employee
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al actualizar el empleado'
      return null
    }
  }

  async function deleteEmpleado(id: string): Promise<boolean> {
    try {
      await withAuthRetry(() => apiFetch(`/${id}`, { method: 'DELETE' }))
      const removed = employees.value.find((e) => e.id === id)
      employees.value = employees.value.filter((e) => e.id !== id)
      stats.value.total = Math.max(0, stats.value.total - 1)
      if (removed?.isActive) stats.value.active = Math.max(0, stats.value.active - 1)
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al eliminar el empleado'
      return false
    }
  }

  async function toggleStatus(id: string): Promise<Employee | null> {
    try {
      const employee = await withAuthRetry(() =>
        apiFetch<Employee>(`/${id}/toggle-status`, { method: 'PATCH' }),
      )
      const idx = employees.value.findIndex((e) => e.id === id)
      if (idx !== -1) employees.value[idx] = employee
      stats.value.active = employees.value.filter((e) => e.isActive).length
      return employee
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cambiar el estado'
      return null
    }
  }

  return {
    // state
    employees,
    stats,
    loading,
    error,
    // computed
    totalEmployees,
    activeEmployees,
    managerCount,
    // actions
    loadEmpleados,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado,
    toggleStatus,
  }
}
