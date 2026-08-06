import { ref, computed } from 'vue'
import { useApi } from './useApi'

export type EmployeeRole = 'MANAGER' | 'SUPERVISOR' | 'COOK' | 'WAITER' | 'CASHIER' | 'DELIVERY_PERSON' | 'CLEANING' | 'SECURITY' | 'OTHER'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_VACATION' | 'ON_LEAVE' | 'SUSPENDED'

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
  MANAGER: 'Gerente',
  SUPERVISOR: 'Supervisor',
  COOK: 'Cocinero',
  WAITER: 'Mesero',
  CASHIER: 'Cajero',
  DELIVERY_PERSON: 'Repartidor',
  CLEANING: 'Limpieza',
  SECURITY: 'Seguridad',
  OTHER: 'Otro',
}

export const EMPLOYEE_ROLE_CLASSES: Record<EmployeeRole, string> = {
  MANAGER: 'bg-purple-100 text-purple-800',
  SUPERVISOR: 'bg-blue-100 text-blue-800',
  COOK: 'bg-orange-100 text-orange-800',
  WAITER: 'bg-green-100 text-green-800',
  CASHIER: 'bg-teal-100 text-teal-800',
  DELIVERY_PERSON: 'bg-yellow-100 text-yellow-800',
  CLEANING: 'bg-gray-100 text-gray-700',
  SECURITY: 'bg-red-100 text-red-800',
  OTHER: 'bg-slate-100 text-slate-700',
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  ON_VACATION: 'Vacaciones',
  ON_LEAVE: 'Licencia',
  SUSPENDED: 'Suspendido',
}

export const EMPLOYEE_STATUS_CLASSES: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  ON_VACATION: 'bg-blue-100 text-blue-800',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
}

// Estado global compartido
const employees = ref<Employee[]>([])
const stats = ref<EmployeeStats>({ total: 0, active: 0, byRole: {} })
const loading = ref(false)
const error = ref<string | null>(null)

export const useEmployees = () => {
  const { get, post, put, patch, del } = useApi()
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const totalEmployees = computed(() => employees.value.length)
  const activeEmployees = computed(() => employees.value.filter((e) => e.isActive).length)
  const managerCount = computed(() =>
    employees.value.filter((e) => e.role === 'MANAGER' || e.role === 'SUPERVISOR').length,
  )

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function loadEmpleados() {
    loading.value = true
    error.value = null
    try {
      const [data, statsData] = await Promise.all([
        get<Employee[]>('/employees'),
        get<EmployeeStats>('/employees/stats'),
      ])
      employees.value = data
      stats.value = statsData
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar los empleados'
      if (err?.status === 401) router.push('/login')
    } finally {
      loading.value = false
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  // El listado (/employees) omite campos sensibles (salario, dirección,
  // contacto de emergencia, etc.) — se cargan aparte solo al abrir edición.
  async function fetchEmployee(id: string): Promise<Employee | null> {
    try {
      return await get<Employee>(`/employees/${id}`)
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar el empleado'
      return null
    }
  }

  async function createEmpleado(payload: CreateEmployeePayload): Promise<Employee | null> {
    try {
      const employee = await post<Employee>('/employees', payload)
      employees.value.push(employee)
      stats.value.total++
      if (employee.isActive) stats.value.active++
      return employee
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear el empleado'
      return null
    }
  }

  async function updateEmpleado(id: string, payload: UpdateEmployeePayload): Promise<Employee | null> {
    try {
      const employee = await put<Employee>(`/employees/${id}`, payload)
      const idx = employees.value.findIndex((e) => e.id === id)
      if (idx !== -1) employees.value[idx] = employee
      return employee
    } catch (err: any) {
      error.value = err?.message ?? 'Error al actualizar el empleado'
      return null
    }
  }

  async function deleteEmpleado(id: string): Promise<boolean> {
    try {
      await del(`/employees/${id}`)
      const removed = employees.value.find((e) => e.id === id)
      employees.value = employees.value.filter((e) => e.id !== id)
      stats.value.total = Math.max(0, stats.value.total - 1)
      if (removed?.isActive) stats.value.active = Math.max(0, stats.value.active - 1)
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar el empleado'
      return false
    }
  }

  async function toggleStatus(id: string): Promise<Employee | null> {
    try {
      const employee = await patch<Employee>(`/employees/${id}/toggle-status`, {})
      const idx = employees.value.findIndex((e) => e.id === id)
      if (idx !== -1) employees.value[idx] = employee
      stats.value.active = employees.value.filter((e) => e.isActive).length
      return employee
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cambiar el estado'
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
    fetchEmployee,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado,
    toggleStatus,
  }
}
