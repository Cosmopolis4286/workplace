<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tasas de Cambio</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Gestiona las monedas y sus tasas de conversión respecto al USD
          </p>
        </div>
        <button
          @click="openModal()"
          class="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Moneda
        </button>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Error -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
        {{ error }}
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Monedas</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.total ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Activas</p>
          <p class="text-3xl font-bold text-green-600 mt-1">{{ stats?.active ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Inactivas</p>
          <p class="text-3xl font-bold text-gray-400 mt-1">{{ stats?.inactive ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Moneda Predeterminada</p>
          <p class="text-2xl font-bold text-indigo-600 mt-1">{{ stats?.defaultCurrency ?? '—' }}</p>
          <p v-if="stats?.defaultRate" class="text-xs text-gray-400 mt-0.5">
            1 USD = {{ stats.defaultRate.toLocaleString('es-VE', { maximumFractionDigits: 4 }) }}
          </p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            v-model="showInactive"
            type="checkbox"
            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            @change="fetchRates(showInactive)"
          />
          Mostrar inactivas
        </label>

        <div class="relative ml-auto w-64">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar moneda..."
            class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Table / Loading skeleton -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <!-- Skeleton -->
        <div v-if="loading" class="divide-y divide-gray-100">
          <div v-for="i in 4" :key="i" class="px-6 py-4 flex items-center gap-4 animate-pulse">
            <div class="w-10 h-10 rounded-full bg-gray-200"></div>
            <div class="flex-1 space-y-1.5">
              <div class="h-4 bg-gray-200 rounded w-32"></div>
              <div class="h-3 bg-gray-100 rounded w-48"></div>
            </div>
            <div class="h-6 bg-gray-200 rounded w-20"></div>
            <div class="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="filtered.length === 0" class="text-center py-16 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="font-medium">No se encontraron monedas</p>
          <p class="text-sm mt-1">Agrega la primera tasa de cambio con el botón de arriba</p>
        </div>

        <!-- Table -->
        <table v-else class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Moneda</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasa (1 USD =)</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fuente</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actualizado</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="rate in filtered"
              :key="rate.id"
              class="hover:bg-gray-50 transition"
            >
              <!-- Currency info -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                    {{ rate.symbol }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-gray-900">{{ rate.code }}</span>
                      <span
                        v-if="rate.isDefault"
                        class="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded"
                      >
                        Predeterminada
                      </span>
                    </div>
                    <p class="text-gray-500 text-xs">{{ rate.name }}</p>
                  </div>
                </div>
              </td>

              <!-- Rate -->
              <td class="px-6 py-4">
                <span class="font-mono font-semibold text-gray-900">
                  {{ rate.rateToUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }}
                  <span class="text-gray-400 font-normal">{{ rate.code }}</span>
                </span>
                <!-- Preview conversion -->
                <p class="text-xs text-gray-400 mt-0.5">
                  $100 → {{ rate.symbol }} {{ (100 * rate.rateToUsd).toLocaleString('es-VE', { maximumFractionDigits: 2 }) }}
                </p>
              </td>

              <!-- Source -->
              <td class="px-6 py-4">
                <span v-if="rate.source" class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                  {{ rate.source }}
                </span>
                <span v-else class="text-gray-400 text-xs">—</span>
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    rate.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                  ]"
                >
                  {{ rate.isActive ? 'Activa' : 'Inactiva' }}
                </span>
              </td>

              <!-- UpdatedAt -->
              <td class="px-6 py-4 text-gray-500 text-xs">
                {{ formatDate(rate.updatedAt) }}
              </td>

              <!-- Actions -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-1 justify-end">
                  <!-- Set default -->
                  <button
                    v-if="!rate.isDefault && rate.isActive"
                    @click="handleSetDefault(rate)"
                    title="Establecer como predeterminada"
                    class="p-1.5 rounded hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>

                  <!-- Toggle status -->
                  <button
                    v-if="!rate.isDefault"
                    @click="handleToggle(rate)"
                    :title="rate.isActive ? 'Desactivar' : 'Activar'"
                    class="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path v-if="rate.isActive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  <!-- Edit -->
                  <button
                    @click="openModal(rate)"
                    title="Editar"
                    class="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Delete -->
                  <button
                    v-if="!rate.isDefault"
                    @click="handleDelete(rate)"
                    title="Eliminar"
                    class="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Conversion preview card -->
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Vista previa de conversión</h2>
        <div class="flex items-center gap-3 mb-4">
          <span class="text-gray-500 text-sm">$</span>
          <input
            v-model.number="previewAmount"
            type="number"
            min="0"
            step="0.01"
            class="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="100"
          />
          <span class="text-gray-500 text-sm">USD</span>
        </div>
        <div v-if="activeRates.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div
            v-for="rate in activeRates"
            :key="rate.id"
            class="bg-gray-50 rounded-lg p-3 border border-gray-100"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-gray-600">{{ rate.code }}</span>
              <span v-if="rate.isDefault" class="text-xs text-indigo-500">★</span>
            </div>
            <p class="font-mono font-semibold text-gray-900 text-sm">
              {{ rate.symbol }} {{ formatConversion(previewAmount || 0, rate).replace(rate.symbol + ' ', '') }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">Tasa: {{ rate.rateToUsd }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No hay monedas activas.</p>
      </div>
    </div>

    <!-- ─── Modal create/edit ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ editingRate ? 'Editar Moneda' : 'Nueva Moneda' }}
            </h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
            <!-- Error -->
            <div v-if="formError" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {{ formError }}
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Code -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Código <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.code"
                  type="text"
                  required
                  maxlength="10"
                  placeholder="VES"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  :class="{ 'border-red-300': !form.code && formTouched }"
                />
                <p class="text-xs text-gray-400 mt-1">Código ISO (ej. VES, COP, EUR)</p>
              </div>

              <!-- Symbol -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Símbolo <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.symbol"
                  type="text"
                  required
                  maxlength="20"
                  placeholder="Bs."
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                maxlength="100"
                placeholder="Bolívar Venezolano"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <!-- Rate -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Tasa (1 USD = X moneda) <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">1 USD =</span>
                <input
                  v-model.number="form.rateToUsd"
                  type="number"
                  required
                  min="0.000001"
                  step="any"
                  placeholder="36.50"
                  class="w-full pl-16 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p v-if="form.rateToUsd && form.code" class="text-xs text-gray-400 mt-1">
                $100 USD = {{ form.symbol || form.code }} {{ (100 * form.rateToUsd).toLocaleString('es-VE', { maximumFractionDigits: 2 }) }}
              </p>
            </div>

            <!-- Source -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fuente / Referencia</label>
              <input
                v-model="form.source"
                type="text"
                maxlength="100"
                placeholder="BCV, Paralelo, Manual..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                v-model="form.notes"
                rows="2"
                maxlength="500"
                placeholder="Observaciones opcionales..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <!-- Checkboxes -->
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input v-model="form.isActive" type="checkbox" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Activa
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input v-model="form.isDefault" type="checkbox" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Predeterminada
              </label>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {{ saving ? 'Guardando...' : editingRate ? 'Actualizar' : 'Crear' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <div
        v-if="deletingRate"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        @click.self="deletingRate = null"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Eliminar moneda</h3>
          <p class="text-sm text-gray-500 mb-6">
            ¿Eliminar <strong>{{ deletingRate.code }} — {{ deletingRate.name }}</strong>? Esta acción no se puede deshacer.
          </p>
          <div class="flex gap-3">
            <button
              @click="deletingRate = null"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              @click="confirmDelete"
              :disabled="saving"
              class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
            >
              {{ saving ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Set default confirm -->
    <Teleport to="body">
      <div
        v-if="settingDefaultRate"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        @click.self="settingDefaultRate = null"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Establecer como predeterminada</h3>
          <p class="text-sm text-gray-500 mb-6">
            ¿Establecer <strong>{{ settingDefaultRate.code }} - {{ settingDefaultRate.name }}</strong> como la moneda predeterminada del sistema?
          </p>
          <div class="flex gap-3">
            <button
              @click="settingDefaultRate = null"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              @click="confirmSetDefault"
              :disabled="saving"
              class="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 transition"
            >
              {{ saving ? 'Estableciendo...' : 'Establecer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toggle status confirm -->
    <Teleport to="body">
      <div
        v-if="togglingRate"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        @click.self="togglingRate = null"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="togglingRate.isActive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            {{ togglingRate.isActive ? 'Desactivar' : 'Activar' }} moneda
          </h3>
          <p class="text-sm text-gray-500 mb-6">
            ¿{{ togglingRate.isActive ? 'Desactivar' : 'Activar' }} <strong>{{ togglingRate.code }} - {{ togglingRate.name }}</strong>?
            {{ togglingRate.isActive ? 'La moneda ya no estará disponible para conversiones.' : 'La moneda estará disponible para conversiones.' }}
          </p>
          <div class="flex gap-3">
            <button
              @click="togglingRate = null"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              @click="confirmToggle"
              :disabled="saving"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {{ saving ? (togglingRate.isActive ? 'Desactivando...' : 'Activando...') : (togglingRate.isActive ? 'Desactivar' : 'Activar') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <div
        v-if="toast"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm transition"
      >
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ toast }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExchangeRates, type ExchangeRate } from '~/composables/useExchangeRates'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const {
  rates,
  stats,
  loading,
  error,
  activeRates,
  fetchRates,
  fetchStats,
  createRate,
  updateRate,
  setDefault,
  toggleStatus,
  deleteRate,
  formatConversion,
} = useExchangeRates()

// ─── Filters ─────────────────────────────────────────────────────────────────

const showInactive = ref(true)
const search = ref('')
const previewAmount = ref(100)

const filtered = computed(() => {
  let list = showInactive.value ? rates.value : rates.value.filter(r => r.isActive)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(r =>
      r.code.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.symbol.toLowerCase().includes(q),
    )
  }
  return list
})

// ─── Modal state ──────────────────────────────────────────────────────────────

const showModal = ref(false)
const editingRate = ref<ExchangeRate | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const formTouched = ref(false)

const form = ref({
  code: '',
  name: '',
  symbol: '',
  rateToUsd: null as number | null,
  source: '',
  notes: '',
  isActive: true,
  isDefault: false,
})

function openModal(rate?: ExchangeRate) {
  editingRate.value = rate ?? null
  formError.value = null
  formTouched.value = false
  if (rate) {
    form.value = {
      code: rate.code,
      name: rate.name,
      symbol: rate.symbol,
      rateToUsd: rate.rateToUsd,
      source: rate.source ?? '',
      notes: rate.notes ?? '',
      isActive: rate.isActive,
      isDefault: rate.isDefault,
    }
  } else {
    form.value = { code: '', name: '', symbol: '', rateToUsd: null, source: '', notes: '', isActive: true, isDefault: false }
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingRate.value = null
}

async function handleSubmit() {
  formTouched.value = true
  formError.value = null
  if (!form.value.code || !form.value.name || !form.value.symbol || !form.value.rateToUsd) {
    formError.value = 'Completa todos los campos requeridos.'
    return
  }
  saving.value = true
  try {
    if (editingRate.value) {
      await updateRate(editingRate.value.id, form.value)
      showToast('Moneda actualizada correctamente')
    } else {
      await createRate(form.value)
      showToast('Moneda creada correctamente')
    }
    await fetchStats()
    closeModal()
  } catch (e: any) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────


const deletingRate = ref<ExchangeRate | null>(null)
const settingDefaultRate = ref<ExchangeRate | null>(null)
const togglingRate = ref<ExchangeRate | null>(null)

function handleDelete(rate: ExchangeRate) {
  deletingRate.value = rate
}

function handleSetDefault(rate: ExchangeRate) {
  settingDefaultRate.value = rate
}

function handleToggle(rate: ExchangeRate) {
  togglingRate.value = rate
}

async function confirmDelete() {
  if (!deletingRate.value) return
  saving.value = true
  try {
    await deleteRate(deletingRate.value.id)
    await fetchStats()
    showToast('Moneda eliminada')
    deletingRate.value = null
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function confirmSetDefault() {
  if (!settingDefaultRate.value) return
  saving.value = true
  try {
    await setDefault(settingDefaultRate.value.id)
    await fetchStats()
    showToast(`${settingDefaultRate.value.code} establecida como moneda predeterminada`)
    settingDefaultRate.value = null
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function confirmToggle() {
  if (!togglingRate.value) return
  saving.value = true
  try {
    await toggleStatus(togglingRate.value.id)
    showToast(`${togglingRate.value.code} ${togglingRate.value.isActive ? 'desactivada' : 'activada'}`)
    togglingRate.value = null
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout>

function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([fetchRates(true), fetchStats()])
})
</script>
