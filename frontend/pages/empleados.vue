<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Empleados</h1>
            <p class="text-emerald-100">Equipo de trabajo del restaurante</p>
          </div>
        </div>
        <button
          @click="openModal()"
          class="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="font-medium">Nuevo Empleado</span>
        </button>
      </div>
    </div>

    <div class="p-6">
      <!-- Error Banner -->
      <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
        <div class="flex items-center space-x-3 text-red-700">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-sm">{{ error }}</span>
        </div>
        <button @click="error = null" class="text-red-400 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Plan usage banner -->
      <PlanUsageBanner :usage="usage" :show="['employees']" />

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Total Empleados</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ stats.total }}</span>
              </p>
              <p class="text-emerald-500 text-sm mt-1">Planilla completa</p>
            </div>
            <div class="p-3 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Activos</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ stats.active }}</span>
              </p>
              <p class="text-green-500 text-sm mt-1">Habilitados</p>
            </div>
            <div class="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Gerentes / Supervisores</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ managerCount }}</span>
              </p>
              <p class="text-purple-500 text-sm mt-1">Líderes de equipo</p>
            </div>
            <div class="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Ausentes</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ absentCount }}</span>
              </p>
              <p class="text-yellow-500 text-sm mt-1">Vacaciones / Licencia</p>
            </div>
            <div class="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-6 border border-white/20">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1 relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            />
          </div>
          <select
            v-model="filterRole"
            class="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm bg-white"
          >
            <option value="">Todos los roles</option>
            <option v-for="(label, role) in EMPLOYEE_ROLE_LABELS" :key="role" :value="role">{{ label }}</option>
          </select>
          <select
            v-model="filterStatus"
            class="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm bg-white"
          >
            <option value="">Todos los estados</option>
            <option v-for="(label, status) in EMPLOYEE_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
          </select>
          <button
            @click="openModal()"
            class="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 text-sm font-medium"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <!-- Loading skeleton -->
        <div v-if="loading" class="p-6 space-y-4">
          <div v-for="i in 5" :key="i" class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-gray-200 animate-pulse rounded-full" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 animate-pulse rounded w-1/3" />
              <div class="h-3 bg-gray-200 animate-pulse rounded w-1/4" />
            </div>
            <div class="w-20 h-6 bg-gray-200 animate-pulse rounded-full" />
            <div class="w-20 h-6 bg-gray-200 animate-pulse rounded-full" />
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredEmployees.length === 0" class="p-12 text-center">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <p class="text-gray-500 font-medium">No hay empleados registrados</p>
          <p class="text-gray-400 text-sm mt-1">Agrega el primer empleado para comenzar</p>
          <button @click="openModal()" class="mt-4 bg-emerald-500 text-white px-6 py-2 rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium">
            Agregar empleado
          </button>
        </div>

        <!-- Table -->
        <table v-else class="w-full">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingreso</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="emp in paginatedEmployees"
              :key="emp.id"
              class="hover:bg-gray-50/50 transition-colors duration-150"
            >
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    :class="emp.isActive ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gray-300'"
                  >
                    {{ emp.firstName[0] }}{{ emp.lastName[0] }}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800 text-sm">{{ emp.firstName }} {{ emp.lastName }}</p>
                    <p v-if="emp.email" class="text-gray-400 text-xs">{{ emp.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-semibold" :class="EMPLOYEE_ROLE_CLASSES[emp.role]">
                  {{ EMPLOYEE_ROLE_LABELS[emp.role] }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <span class="px-2 py-1 rounded-full text-xs font-semibold w-fit" :class="EMPLOYEE_STATUS_CLASSES[emp.status]">
                    {{ EMPLOYEE_STATUS_LABELS[emp.status] }}
                  </span>
                  <span v-if="!emp.isActive" class="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 w-fit">Deshabilitado</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="space-y-0.5">
                  <p v-if="emp.phone" class="text-sm text-gray-600">{{ emp.phone }}</p>
                  <p v-else class="text-xs text-gray-400 italic">Sin teléfono</p>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ emp.hireDate ? formatDate(emp.hireDate) : '—' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end space-x-2">
                  <button
                    @click="toggleStatus(emp.id)"
                    :title="emp.isActive ? 'Deshabilitar' : 'Habilitar'"
                    class="p-1.5 rounded-lg transition-colors duration-200"
                    :class="emp.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                  <button
                    @click="openModal(emp)"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    @click="confirmDelete(emp)"
                    class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p class="text-sm text-gray-500">
            {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredEmployees.length) }}
            de {{ filteredEmployees.length }} empleados
          </p>
          <div class="flex space-x-2">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="px-3 py-1 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >Anterior</button>
            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >Siguiente</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-100">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-gray-800">{{ editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado' }}</h2>
              <button @click="closeModal" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <form @submit.prevent="saveEmployee" class="p-6 space-y-5">
            <!-- Nombre -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input
                  v-model="form.firstName"
                  type="text"
                  required
                  placeholder="Juan"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Apellido <span class="text-red-500">*</span></label>
                <input
                  v-model="form.lastName"
                  type="text"
                  required
                  placeholder="García"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
            </div>

            <!-- Rol y Estado -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select v-model="form.role" class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm bg-white">
                  <option v-for="(label, role) in EMPLOYEE_ROLE_LABELS" :key="role" :value="role">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select v-model="form.status" class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm bg-white">
                  <option v-for="(label, status) in EMPLOYEE_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
                </select>
              </div>
            </div>

            <!-- Contacto -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
            </div>

            <!-- Salario y Fecha de ingreso -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Salario</label>
                <input
                  v-model.number="form.salary"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de ingreso</label>
                <input
                  v-model="form.hireDateInput"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
            </div>

            <!-- Dirección -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                v-model="form.address"
                type="text"
                placeholder="Calle, número, colonia..."
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
              />
            </div>

            <!-- Contacto de emergencia -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Contacto de emergencia</label>
                <input
                  v-model="form.emergencyContact"
                  type="text"
                  placeholder="Nombre del contacto"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono de emergencia</label>
                <input
                  v-model="form.emergencyPhone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
            </div>

            <!-- Notas -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                v-model="form.notes"
                rows="2"
                placeholder="Observaciones adicionales..."
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm resize-none"
              />
            </div>

            <!-- Buttons -->
            <div class="flex justify-end space-x-3 pt-2">
              <button type="button" @click="closeModal" class="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="saving">Guardando...</span>
                <span v-else>{{ editingEmployee ? 'Guardar cambios' : 'Crear empleado' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div class="flex items-center space-x-4 mb-4">
            <div class="p-3 bg-red-100 rounded-xl">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-800">Eliminar empleado</h3>
              <p class="text-sm text-gray-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <p class="text-gray-600 mb-6 text-sm">
            ¿Estás seguro de que deseas eliminar a <strong>{{ deletingEmployee?.firstName }} {{ deletingEmployee?.lastName }}</strong>?
          </p>
          <div class="flex justify-end space-x-3">
            <button @click="showDeleteModal = false" class="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button @click="deleteEmployee" :disabled="saving" class="px-5 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
              <span v-if="saving">Eliminando...</span>
              <span v-else>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useEmpleados,
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_ROLE_CLASSES,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_CLASSES,
  type Employee,
  type EmployeeRole,
  type EmployeeStatus,
} from '~/composables/useEmpleados'
import { usePlans } from '~/composables/usePlans'
import PlanUsageBanner from '~/components/PlanUsageBanner.vue'

definePageMeta({ middleware: 'auth' })

const {
  employees,
  stats,
  loading,
  error,
  managerCount,
  loadEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  toggleStatus,
} = useEmpleados()

// ─── Filters ────────────────────────────────────────────────────────────────

const searchQuery = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = 10

const filteredEmployees = computed(() => {
  let list = employees.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((e) =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.phone?.includes(q),
    )
  }
  if (filterRole.value) list = list.filter((e) => e.role === filterRole.value)
  if (filterStatus.value) list = list.filter((e) => e.status === filterStatus.value)
  return list
})

const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / pageSize))
const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredEmployees.value.slice(start, start + pageSize)
})

const absentCount = computed(() =>
  employees.value.filter((e) => e.status === 'VACACIONES' || e.status === 'LICENCIA').length,
)

// Reset page on filter change
watch([searchQuery, filterRole, filterStatus], () => { currentPage.value = 1 })

// ─── Modal ──────────────────────────────────────────────────────────────────

const showModal = ref(false)
const editingEmployee = ref<Employee | null>(null)
const saving = ref(false)

const emptyForm = () => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'OTRO' as EmployeeRole,
  status: 'ACTIVO' as EmployeeStatus,
  salary: undefined as number | undefined,
  hireDateInput: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: '',
  notes: '',
})

const form = ref(emptyForm())

function openModal(emp?: Employee) {
  editingEmployee.value = emp ?? null
  if (emp) {
    form.value = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email ?? '',
      phone: emp.phone ?? '',
      role: emp.role,
      status: emp.status,
      salary: emp.salary,
      hireDateInput: emp.hireDate ? emp.hireDate.substring(0, 10) : '',
      address: emp.address ?? '',
      emergencyContact: emp.emergencyContact ?? '',
      emergencyPhone: emp.emergencyPhone ?? '',
      notes: emp.notes ?? '',
    }
  } else {
    form.value = emptyForm()
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingEmployee.value = null
}

async function saveEmployee() {
  saving.value = true
  const payload = {
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    email: form.value.email || undefined,
    phone: form.value.phone || undefined,
    role: form.value.role,
    status: form.value.status,
    salary: form.value.salary,
    hireDate: form.value.hireDateInput ? `${form.value.hireDateInput}T00:00:00.000Z` : undefined,
    address: form.value.address || undefined,
    emergencyContact: form.value.emergencyContact || undefined,
    emergencyPhone: form.value.emergencyPhone || undefined,
    notes: form.value.notes || undefined,
  }

  let ok: Employee | null
  if (editingEmployee.value) {
    ok = await updateEmpleado(editingEmployee.value.id, payload)
  } else {
    ok = await createEmpleado(payload)
  }

  saving.value = false
  if (ok) closeModal()
}

// ─── Delete ──────────────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const deletingEmployee = ref<Employee | null>(null)

function confirmDelete(emp: Employee) {
  deletingEmployee.value = emp
  showDeleteModal.value = true
}

async function deleteEmployee() {
  if (!deletingEmployee.value) return
  saving.value = true
  const ok = await deleteEmpleado(deletingEmployee.value.id)
  saving.value = false
  if (ok) showDeleteModal.value = false
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Init ───────────────────────────────────────────────────────────────────

const { usage, fetchUsage } = usePlans()
onMounted(() => { loadEmpleados(); fetchUsage() })
</script>
