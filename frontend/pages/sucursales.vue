<template>
  <div class="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Sucursales</h1>
            <p class="text-violet-100">Negocios y sucursales del mismo propietario</p>
          </div>
        </div>
        <button
          @click="openModal()"
          class="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span class="font-medium">Nueva Sucursal</span>
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
      <PlanUsageBanner :usage="usage" :show="['branches']" />

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Total Sucursales</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ stats.total }}</span>
              </p>
              <p class="text-violet-500 text-sm mt-1">Todas las ubicaciones</p>
            </div>
            <div class="p-3 bg-gradient-to-br from-violet-400 to-purple-600 rounded-xl shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Activas</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ stats.active }}</span>
              </p>
              <p class="text-green-500 text-sm mt-1">En operación</p>
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
              <p class="text-gray-600 text-sm font-medium">En Construcción</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loading" class="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" />
                <span v-else>{{ inConstructionCount }}</span>
              </p>
              <p class="text-yellow-500 text-sm mt-1">Próximas aperturas</p>
            </div>
            <div class="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
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
              placeholder="Buscar por nombre o dirección..."
              class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
            />
          </div>
          <select
            v-model="filterStatus"
            class="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm bg-white"
          >
            <option value="">Todos los estados</option>
            <option v-for="(label, status) in BRANCH_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
          </select>
          <button
            @click="openModal()"
            class="flex items-center space-x-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-4 py-2 rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-200 text-sm font-medium"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Nueva</span>
          </button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="bg-white/80 rounded-2xl shadow-xl p-6 animate-pulse">
          <div class="h-5 bg-gray-200 rounded w-1/2 mb-3" />
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div class="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredBranches.length === 0" class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-white/20">
        <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
        <p class="text-gray-500 font-medium">No hay sucursales registradas</p>
        <p class="text-gray-400 text-sm mt-1">Agrega tu primera sucursal o negocio</p>
        <button @click="openModal()" class="mt-4 bg-violet-500 text-white px-6 py-2 rounded-xl hover:bg-violet-600 transition-colors text-sm font-medium">
          Agregar sucursal
        </button>
      </div>

      <!-- Branch Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="branch in filteredBranches"
          :key="branch.id"
          class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
        >
          <!-- Color accent top bar -->
          <div class="h-2" :style="{ backgroundColor: branch.color }" />

          <div class="p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" :style="{ backgroundColor: branch.color }">
                  {{ branch.name[0].toUpperCase() }}
                </div>
                <div>
                  <h3 class="font-bold text-gray-800 text-base leading-tight">{{ branch.name }}</h3>
                  <p v-if="branch.type" class="text-xs text-gray-400">{{ branch.type }}</p>
                </div>
              </div>
              <span class="px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0" :class="BRANCH_STATUS_CLASSES[branch.status]">
                {{ BRANCH_STATUS_LABELS[branch.status] }}
              </span>
            </div>

            <div class="space-y-1.5 text-sm text-gray-500 mb-4">
              <div v-if="branch.address" class="flex items-start space-x-2">
                <svg class="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span class="line-clamp-1">{{ branch.address }}</span>
              </div>
              <div v-if="branch.phone" class="flex items-center space-x-2">
                <svg class="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                <span>{{ branch.phone }}</span>
              </div>
              <div v-if="branch.managerName" class="flex items-center space-x-2">
                <svg class="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <span>{{ branch.managerName }}</span>
              </div>
            </div>

            <!-- Status change + actions -->
            <div class="flex items-center justify-between border-t border-gray-100 pt-3">
              <select
                :value="branch.status"
                @change="changeStatus(branch.id, ($event.target as HTMLSelectElement).value as BranchStatus)"
                class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
              >
                <option v-for="(label, status) in BRANCH_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
              </select>

              <div class="flex space-x-1">
                <button @click="openModal(branch)" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button @click="confirmDelete(branch)" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-100">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-gray-800">{{ editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal' }}</h2>
              <button @click="closeModal" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <form @submit.prevent="saveBranch" class="p-6 space-y-4">
            <!-- Nombre y tipo -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="Sucursal Norte"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <input
                  v-model="form.type"
                  type="text"
                  placeholder="Sucursal, Franquicia..."
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                />
              </div>
            </div>

            <!-- Estado -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select v-model="form.status" class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm bg-white">
                <option v-for="(label, status) in BRANCH_STATUS_LABELS" :key="status" :value="status">{{ label }}</option>
              </select>
            </div>

            <!-- Dirección -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                v-model="form.address"
                type="text"
                placeholder="Calle, número, colonia..."
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
              />
            </div>

            <!-- Contacto -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  v-model="form.phone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="sucursal@ejemplo.com"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                />
              </div>
            </div>

            <!-- Manager -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Encargado</label>
                <input
                  v-model="form.managerName"
                  type="text"
                  placeholder="Nombre del encargado"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tel. encargado</label>
                <input
                  v-model="form.managerPhone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
                />
              </div>
            </div>

            <!-- Color -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Color identificador</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in BRANCH_COLORS"
                  :key="color"
                  type="button"
                  @click="form.color = color"
                  class="w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110"
                  :style="{ backgroundColor: color }"
                  :class="form.color === color ? 'border-gray-800 scale-110' : 'border-transparent'"
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
                class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm resize-none"
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
                class="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="saving">Guardando...</span>
                <span v-else>{{ editingBranch ? 'Guardar cambios' : 'Crear sucursal' }}</span>
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
              <h3 class="text-lg font-bold text-gray-800">Eliminar sucursal</h3>
              <p class="text-sm text-gray-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <p class="text-gray-600 mb-6 text-sm">
            ¿Estás seguro de que deseas eliminar la sucursal <strong>{{ deletingBranch?.name }}</strong>?
          </p>
          <div class="flex justify-end space-x-3">
            <button @click="showDeleteModal = false" class="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button @click="deleteBranch" :disabled="saving" class="px-5 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
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
  useSucursales,
  BRANCH_STATUS_LABELS,
  BRANCH_STATUS_CLASSES,
  BRANCH_COLORS,
  type Branch,
  type BranchStatus,
} from '~/composables/useSucursales'
import { usePlans } from '~/composables/usePlans'
import PlanUsageBanner from '~/components/PlanUsageBanner.vue'

definePageMeta({ middleware: 'auth' })

const {
  branches,
  stats,
  loading,
  error,
  inConstructionCount,
  loadSucursales,
  createSucursal,
  updateSucursal,
  deleteSucursal,
  updateStatus,
} = useSucursales()

// ─── Filters ────────────────────────────────────────────────────────────────

const searchQuery = ref('')
const filterStatus = ref('')

const filteredBranches = computed(() => {
  let list = branches.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      b.address?.toLowerCase().includes(q),
    )
  }
  if (filterStatus.value) list = list.filter((b) => b.status === filterStatus.value)
  return list
})

// ─── Modal ──────────────────────────────────────────────────────────────────

const showModal = ref(false)
const editingBranch = ref<Branch | null>(null)
const saving = ref(false)

const emptyForm = () => ({
  name: '',
  address: '',
  phone: '',
  email: '',
  type: '',
  managerName: '',
  managerPhone: '',
  status: 'ACTIVA' as BranchStatus,
  color: BRANCH_COLORS[5],
  notes: '',
})

const form = ref(emptyForm())

function openModal(branch?: Branch) {
  editingBranch.value = branch ?? null
  if (branch) {
    form.value = {
      name: branch.name,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      type: branch.type ?? '',
      managerName: branch.managerName ?? '',
      managerPhone: branch.managerPhone ?? '',
      status: branch.status,
      color: branch.color,
      notes: branch.notes ?? '',
    }
  } else {
    form.value = emptyForm()
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingBranch.value = null
}

async function saveBranch() {
  saving.value = true
  const payload = {
    name: form.value.name,
    address: form.value.address || undefined,
    phone: form.value.phone || undefined,
    email: form.value.email || undefined,
    type: form.value.type || undefined,
    managerName: form.value.managerName || undefined,
    managerPhone: form.value.managerPhone || undefined,
    status: form.value.status,
    color: form.value.color,
    notes: form.value.notes || undefined,
  }

  let ok: Branch | null
  if (editingBranch.value) {
    ok = await updateSucursal(editingBranch.value.id, payload)
  } else {
    ok = await createSucursal(payload)
  }

  saving.value = false
  if (ok) closeModal()
}

// ─── Status change ───────────────────────────────────────────────────────────

async function changeStatus(id: string, status: BranchStatus) {
  await updateStatus(id, status)
}

// ─── Delete ──────────────────────────────────────────────────────────────────

const showDeleteModal = ref(false)
const deletingBranch = ref<Branch | null>(null)

function confirmDelete(branch: Branch) {
  deletingBranch.value = branch
  showDeleteModal.value = true
}

async function deleteBranch() {
  if (!deletingBranch.value) return
  saving.value = true
  const ok = await deleteSucursal(deletingBranch.value.id)
  saving.value = false
  if (ok) showDeleteModal.value = false
}

// ─── Init ───────────────────────────────────────────────────────────────────

const { usage, fetchUsage } = usePlans()
onMounted(() => { loadSucursales(); fetchUsage() })
</script>
