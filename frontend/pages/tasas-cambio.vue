<template>
  <div>
    <PageHeader
      title="Tasas de Cambio"
      description="Gestiona las monedas y sus tasas de conversión respecto al USD"
      :icon="CurrencyDollarIcon"
      :breadcrumb="[{ label: 'Tasas de Cambio' }]"
      :stats="headerStats"
    >
      <template #actions>
        <button v-if="canManage" class="btn-primary flex items-center gap-2" @click="openModal()">
          <PlusIcon class="h-5 w-5" />
          Nueva Moneda
        </button>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ── Lista principal ────────────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Filtros -->
        <div class="card p-4 flex flex-col sm:flex-row gap-3 items-center">
          <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none flex-shrink-0">
            <input v-model="showInactive" type="checkbox" class="rounded border-gray-300 text-red-600" @change="fetchRates(showInactive)" />
            Mostrar inactivas
          </label>
          <div class="relative flex-1">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input v-model="search" type="text" placeholder="Buscar moneda..." class="input-field pl-9" />
          </div>
        </div>

        <!-- Tabla -->
        <div class="card overflow-hidden">
          <!-- Skeleton -->
          <template v-if="loading">
            <div v-for="i in 4" :key="i" class="p-4 flex items-center gap-4 border-b border-gray-100">
              <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2"><div class="skeleton h-4 w-32 rounded" /><div class="skeleton h-3 w-48 rounded" /></div>
              <div class="skeleton h-6 w-20 rounded-full" />
            </div>
          </template>

          <!-- Vacío -->
          <div v-else-if="filtered.length === 0" class="p-12 text-center">
            <CurrencyDollarIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500 font-medium">No se encontraron monedas</p>
          </div>

          <!-- Filas -->
          <template v-else>
            <!-- Cabecera -->
            <div class="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div class="col-span-4">Moneda</div>
              <div class="col-span-3">Tasa (1 USD =)</div>
              <div class="col-span-2 hidden sm:block">Fuente</div>
              <div class="col-span-2">Estado</div>
              <div class="col-span-1"></div>
            </div>

            <div class="divide-y divide-gray-100">
              <div v-for="rate in filtered" :key="rate.id" class="px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-gray-50 transition-colors group">
                <!-- Moneda -->
                <div class="col-span-4 flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm flex-shrink-0">
                    {{ rate.symbol }}
                  </div>
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-semibold text-gray-900 text-sm">{{ rate.code }}</span>
                      <span v-if="rate.isDefault" class="badge bg-red-100 text-red-700 text-[10px]">Predeterminada</span>
                    </div>
                    <p class="text-xs text-gray-400">{{ rate.name }}</p>
                  </div>
                </div>

                <!-- Tasa -->
                <div class="col-span-3">
                  <span class="font-mono font-semibold text-gray-900 text-sm">
                    {{ rate.rateToUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }}
                    <span class="text-gray-400 font-normal text-xs">{{ rate.code }}</span>
                  </span>
                  <p class="text-[10px] text-gray-400 mt-0.5">${{ previewAmount }} → {{ rate.symbol }} {{ (previewAmount * rate.rateToUsd).toLocaleString('es-VE', { maximumFractionDigits: 2 }) }}</p>
                </div>

                <!-- Fuente -->
                <div class="col-span-2 hidden sm:flex items-center gap-1">
                  <span v-if="rate.source" class="badge bg-gray-100 text-gray-600">{{ rate.source }}</span>
                  <span v-else class="text-xs text-gray-400">—</span>
                  <span v-if="rate.code === 'VES' && rate.autoSync" class="badge bg-green-100 text-green-700 flex items-center gap-0.5">
                    <ArrowPathIcon class="h-2.5 w-2.5" />BCV
                  </span>
                  <span v-if="rate.autoSync && rate.syncError" class="badge bg-red-100 text-red-700 flex items-center gap-0.5" :title="rate.syncError">
                    <ExclamationTriangleIcon class="h-2.5 w-2.5" />Error
                  </span>
                </div>

                <!-- Estado -->
                <div class="col-span-2">
                  <span class="badge" :class="rate.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                    {{ rate.isActive ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>

                <!-- Acciones hover -->
                <div class="col-span-1 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button v-if="canManage && !rate.isDefault && rate.isActive" class="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors" title="Predeterminar" @click="handleSetDefault(rate)">
                    <StarIcon class="h-3.5 w-3.5" />
                  </button>
                  <button v-if="canManage && !rate.isDefault" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" :title="rate.isActive ? 'Desactivar' : 'Activar'" @click="handleToggle(rate)">
                    <component :is="rate.isActive ? NoSymbolIcon : CheckCircleIcon" class="h-3.5 w-3.5" />
                  </button>
                  <button v-if="canManage && rate.code === 'VES' && rate.autoSync" class="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Sincronizar BCV" :disabled="syncingCode === rate.code" @click="handleManualSyncFromTable(rate)">
                    <ArrowPathIcon class="h-3.5 w-3.5" :class="{ 'animate-spin': syncingCode === rate.code }" />
                  </button>
                  <button class="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors" title="Historial de cambios" @click="openHistory(rate)">
                    <ClockIcon class="h-3.5 w-3.5" />
                  </button>
                  <button v-if="canManage" class="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Editar" @click="openModal(rate)">
                    <PencilIcon class="h-3.5 w-3.5" />
                  </button>
                  <button v-if="canManage && !rate.isDefault" class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar" @click="handleDelete(rate)">
                    <TrashIcon class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Vista previa de conversión -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Vista previa</h3>
          <div class="flex items-center gap-2 mb-4">
            <span class="text-gray-500 text-sm">$</span>
            <input v-model.number="previewAmount" type="number" min="0" step="1" placeholder="100" class="input-field w-24 text-center" />
            <span class="text-gray-500 text-sm">USD</span>
          </div>
          <div v-if="activeRates.length > 0" class="space-y-2">
            <div v-for="rate in activeRates" :key="rate.id" class="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-700">{{ rate.code }}</span>
                <StarIcon v-if="rate.isDefault" class="h-3 w-3 text-red-400" />
              </div>
              <span class="font-mono font-semibold text-gray-900 text-sm">
                {{ rate.symbol }} {{ formatConversion(previewAmount || 0, rate).replace(rate.symbol + ' ', '') }}
              </span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">No hay monedas activas.</p>
        </div>

        <!-- Estado de sincronización -->
        <div v-if="syncStatuses.length > 0" class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-700">Sincronización auto</h3>
            <button v-if="canManage" class="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50" :disabled="syncingAll" @click="handleSyncAll">
              <ArrowPathIcon class="h-3 w-3" :class="{ 'animate-spin': syncingAll }" />
              {{ syncingAll ? 'Sincronizando...' : 'Sincronizar todas' }}
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="s in syncStatuses" :key="s.currencyCode" class="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-700">{{ s.currencyCode }}</span>
                <span v-if="s.syncError" class="badge bg-red-100 text-red-700 flex items-center gap-0.5" :title="s.syncError">
                  <ExclamationTriangleIcon class="h-2.5 w-2.5" />Error
                </span>
                <span v-else-if="s.isStale" class="badge bg-yellow-100 text-yellow-700">Atrasada</span>
                <span v-else class="badge bg-green-100 text-green-700">Al día</span>
              </div>
              <span class="text-[10px] text-gray-400">{{ s.lastSyncAt ? formatDateTime(s.lastSyncAt) : 'Nunca' }}</span>
            </div>
          </div>
        </div>

        <!-- Resumen -->
        <div class="card p-5 border-l-4 border-l-red-400">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Resumen</h3>
          <div class="space-y-2.5">
            <div class="flex justify-between text-sm"><span class="text-gray-500">Total monedas</span><span class="font-bold text-gray-900">{{ stats?.total ?? '—' }}</span></div>
            <div class="flex justify-between text-sm"><span class="text-gray-500">Activas</span><span class="font-bold text-green-600">{{ stats?.active ?? '—' }}</span></div>
            <div class="flex justify-between text-sm"><span class="text-gray-500">Inactivas</span><span class="font-bold text-gray-400">{{ stats?.inactive ?? '—' }}</span></div>
            <div class="h-px bg-gray-100" />
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Predeterminada</span>
              <span class="font-bold text-red-600">{{ stats?.defaultCurrency ?? '—' }}</span>
            </div>
            <div v-if="stats?.defaultRate" class="text-xs text-gray-400 text-right">1 USD = {{ stats.defaultRate.toLocaleString('es-VE', { maximumFractionDigits: 4 }) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal crear/editar ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeModal">
          <div class="absolute inset-0 bg-black/40" @click="closeModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="text-base font-bold text-gray-900">{{ editingRate ? 'Editar Moneda' : 'Nueva Moneda' }}</h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="closeModal"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
              <div v-if="formError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{{ formError }}</div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Código <span class="text-red-500">*</span></label>
                  <input v-model="form.code" type="text" required maxlength="10" placeholder="VES" class="input-field uppercase" />
                  <p class="text-xs text-gray-400 mt-1">ISO (ej. VES, COP, EUR)</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Símbolo <span class="text-red-500">*</span></label>
                  <input v-model="form.symbol" type="text" required maxlength="20" placeholder="Bs." class="input-field" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="form.name" type="text" required maxlength="100" placeholder="Bolívar Venezolano" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tasa (1 USD = X moneda) <span class="text-red-500">*</span></label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">1 USD =</span>
                  <input v-model.number="form.rateToUsd" type="number" required min="0.000001" step="any" placeholder="36.50" class="input-field pl-16" />
                </div>
                <p v-if="form.rateToUsd && form.code" class="text-xs text-gray-400 mt-1">
                  $100 USD = {{ form.symbol || form.code }} {{ (100 * form.rateToUsd).toLocaleString('es-VE', { maximumFractionDigits: 2 }) }}
                </p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Fuente / Referencia</label>
                <input v-model="form.source" type="text" maxlength="100" placeholder="BCV, Paralelo, Manual..." class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea v-model="form.notes" rows="2" maxlength="500" class="input-field resize-none" />
              </div>
              <div class="flex flex-wrap gap-5">
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="form.isActive" type="checkbox" class="rounded border-gray-300 text-red-600" />Activa
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input v-model="form.isDefault" type="checkbox" class="rounded border-gray-300 text-red-600" />Predeterminada
                </label>
                <label v-if="form.code.toUpperCase() === 'VES'" class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer" title="Sincronizar con BCV diariamente a las 5 PM">
                  <input v-model="form.autoSync" type="checkbox" class="rounded border-gray-300 text-green-600" />
                  <span class="flex items-center gap-1"><ArrowPathIcon class="h-4 w-4 text-green-600" />Auto-sync BCV</span>
                </label>
              </div>
              <!-- Panel BCV en edición -->
              <div v-if="editingRate?.code === 'VES'" class="bg-green-50 border border-green-100 rounded-xl p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-green-800">Sincronización BCV</p>
                    <p class="text-xs text-green-600 mt-0.5">
                      {{ editingRate.autoSync ? '✅ Auto-sync activado' : '⚠️ Auto-sync desactivado' }}
                      <span v-if="editingRate.lastSyncAt"> · {{ formatDateTime(editingRate.lastSyncAt) }}</span>
                    </p>
                  </div>
                  <button v-if="editingRate.autoSync" type="button" class="btn-secondary text-xs" :disabled="syncing" @click="handleManualSync">
                    {{ syncing ? 'Sincronizando...' : 'Sincronizar ahora' }}
                  </button>
                </div>
                <div v-if="editingRate.syncError" class="mt-2 pt-2 border-t border-green-100 flex items-start gap-1.5">
                  <ExclamationTriangleIcon class="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p class="text-xs text-red-600">
                    {{ editingRate.syncError }}
                    <span v-if="editingRate.syncAttempts" class="text-red-400">({{ editingRate.syncAttempts }} intento{{ editingRate.syncAttempts === 1 ? '' : 's' }} fallido{{ editingRate.syncAttempts === 1 ? '' : 's' }})</span>
                  </p>
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                <button type="submit" :disabled="saving" class="btn-primary flex-1">
                  {{ saving ? 'Guardando...' : (editingRate ? 'Actualizar' : 'Crear') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modales de confirmación ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="deletingRate" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="deletingRate = null">
          <div class="absolute inset-0 bg-black/40" @click="deletingRate = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-2">Eliminar moneda</h3>
            <p class="text-sm text-gray-500 mb-5">¿Eliminar <strong>{{ deletingRate.code }} — {{ deletingRate.name }}</strong>? Esta acción no se puede deshacer.</p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="deletingRate = null">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors" :disabled="saving" @click="confirmDelete">
                {{ saving ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="settingDefaultRate" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="settingDefaultRate = null">
          <div class="absolute inset-0 bg-black/40" @click="settingDefaultRate = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-2">Establecer como predeterminada</h3>
            <p class="text-sm text-gray-500 mb-5">¿Establecer <strong>{{ settingDefaultRate.code }} - {{ settingDefaultRate.name }}</strong> como la moneda predeterminada?</p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="settingDefaultRate = null">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors" :disabled="saving" @click="confirmSetDefault">
                {{ saving ? 'Estableciendo...' : 'Establecer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="togglingRate" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="togglingRate = null">
          <div class="absolute inset-0 bg-black/40" @click="togglingRate = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-2">{{ togglingRate.isActive ? 'Desactivar' : 'Activar' }} moneda</h3>
            <p class="text-sm text-gray-500 mb-5">
              ¿{{ togglingRate.isActive ? 'Desactivar' : 'Activar' }} <strong>{{ togglingRate.code }}</strong>?
              {{ togglingRate.isActive ? 'Ya no estará disponible para conversiones.' : 'Estará disponible para conversiones.' }}
            </p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="togglingRate = null">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors" :disabled="saving" @click="confirmToggle">
                {{ saving ? '...' : (togglingRate.isActive ? 'Desactivar' : 'Activar') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal historial de auditoría ────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="historyRate" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="historyRate = null">
          <div class="absolute inset-0 bg-black/40" @click="historyRate = null" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 class="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ClockIcon class="h-4.5 w-4.5 text-indigo-500" />
                  Historial — {{ historyRate.code }}
                </h2>
                <p class="text-xs text-gray-400 mt-0.5">{{ historyRate.name }}</p>
              </div>
              <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="historyRate = null"><XMarkIcon class="h-5 w-5" /></button>
            </div>

            <div class="p-6">
              <!-- Loading -->
              <div v-if="loadingHistory" class="space-y-3">
                <div v-for="i in 4" :key="i" class="skeleton h-14 rounded-xl" />
              </div>

              <!-- Vacío -->
              <div v-else-if="history.length === 0" class="text-center py-10">
                <ClockIcon class="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p class="text-sm text-gray-500">Sin cambios registrados todavía.</p>
              </div>

              <!-- Timeline -->
              <ol v-else class="relative border-l-2 border-gray-100 ml-2 space-y-5">
                <li v-for="entry in history" :key="entry.id" class="ml-4">
                  <span
                    class="absolute -left-[7px] w-3 h-3 rounded-full ring-2 ring-white"
                    :class="entry.newRate > (entry.previousRate ?? 0) ? 'bg-green-500' : entry.newRate < (entry.previousRate ?? Infinity) ? 'bg-red-500' : 'bg-gray-300'"
                  />
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-gray-900">
                      <template v-if="entry.previousRate !== null">
                        {{ entry.previousRate.toLocaleString('es-VE', { maximumFractionDigits: 6 }) }}
                        <span class="text-gray-400 mx-1">→</span>
                      </template>
                      {{ entry.newRate.toLocaleString('es-VE', { maximumFractionDigits: 6 }) }}
                      <span class="text-gray-400 font-normal">{{ entry.code }}</span>
                    </p>
                    <span class="badge flex-shrink-0" :class="sourceBadgeClass(entry.source)">{{ sourceLabel(entry.source) }}</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5">
                    {{ formatDateTime(entry.createdAt) }}
                    <span v-if="entry.changedBy"> · por usuario {{ entry.changedBy.slice(0, 8) }}…</span>
                    <span v-else> · automático</span>
                  </p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="toast" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm">
          <CheckCircleIcon class="h-4 w-4 text-green-400 flex-shrink-0" />
          {{ toast }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CurrencyDollarIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon,
  PencilIcon, TrashIcon, ArrowPathIcon, StarIcon,
  NoSymbolIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useExchangeRates, type ExchangeRate, type ExchangeRateHistoryEntry, type SyncStatusEntry } from '~/composables/useExchangeRates'
import { usePermissions } from '~/composables/usePermissions'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const { can } = usePermissions()
const canManage = computed(() => can('exchange_rates:manage'))

const { rates, stats, loading, error, activeRates, fetchRates, fetchStats, createRate, updateRate, setDefault, toggleStatus, deleteRate, manualSync, syncAll, getAllSyncStatuses, formatConversion, fetchHistory } = useExchangeRates()

// ─── Filtros ──────────────────────────────────────────────────────────────────
const showInactive   = ref(true)
const search         = ref('')
const previewAmount  = ref(100)

const filtered = computed(() => {
  let list = showInactive.value ? rates.value : rates.value.filter((r: ExchangeRate) => r.isActive)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((r: ExchangeRate) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q))
  }
  return list
})

const headerStats = computed(() => [
  { label: 'Total',        value: String(stats.value?.total  ?? '—') },
  { label: 'Activas',      value: String(stats.value?.active ?? '—') },
  { label: 'Inactivas',    value: String(stats.value?.inactive ?? '—') },
  { label: 'Predeterminada', value: stats.value?.defaultCurrency ?? '—' },
])

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal   = ref(false)
const editingRate = ref<ExchangeRate | null>(null)
const saving      = ref(false)
const formError   = ref<string | null>(null)
const formTouched = ref(false)

const form = ref({ code: '', name: '', symbol: '', rateToUsd: null as number | null, source: '', notes: '', isActive: true, isDefault: false, autoSync: false })

function openModal(rate?: ExchangeRate) {
  editingRate.value = rate ?? null; formError.value = null; formTouched.value = false
  form.value = rate
    ? { code: rate.code, name: rate.name, symbol: rate.symbol, rateToUsd: rate.rateToUsd, source: rate.source ?? '', notes: rate.notes ?? '', isActive: rate.isActive, isDefault: rate.isDefault, autoSync: rate.autoSync ?? false }
    : { code: '', name: '', symbol: '', rateToUsd: null, source: '', notes: '', isActive: true, isDefault: false, autoSync: false }
  showModal.value = true
}

function closeModal() { showModal.value = false; editingRate.value = null }

async function handleSubmit() {
  formTouched.value = true; formError.value = null
  if (!form.value.code || !form.value.name || !form.value.symbol || !form.value.rateToUsd) {
    formError.value = 'Completa todos los campos requeridos.'; return
  }
  saving.value = true
  try {
    if (editingRate.value) { await updateRate(editingRate.value.id, form.value); showToast('Moneda actualizada') }
    else { await createRate(form.value); showToast('Moneda creada') }
    await fetchStats(); closeModal()
  } catch (e: any) { formError.value = e?.data?.message ?? e.message }
  finally { saving.value = false }
}

// ─── BCV Sync ─────────────────────────────────────────────────────────────────
const syncing      = ref(false)
const syncingCode  = ref<string | null>(null)
const syncingAll   = ref(false)
const syncStatuses = ref<SyncStatusEntry[]>([])

async function loadSyncStatuses() {
  try { syncStatuses.value = await getAllSyncStatuses() }
  catch { /* non-critical */ }
}

async function handleSyncAll() {
  if (syncingAll.value) return
  syncingAll.value = true
  try {
    const results = await syncAll()
    const successCount = results.filter(r => r.success).length
    showToast(`Sincronización completa: ${successCount}/${results.length} monedas actualizadas`)
    await Promise.all([fetchRates(showInactive.value), loadSyncStatuses()])
  } catch (e: any) {
    showToast(e?.data?.message ?? 'Error al sincronizar todas las monedas')
  } finally {
    syncingAll.value = false
  }
}

async function handleManualSync() {
  if (!editingRate.value) return; syncing.value = true; formError.value = null
  try {
    const res = await manualSync('VES')
    if (res.success) { showToast(`Sincronizado: 1 USD = ${res.rate} VES`); await Promise.all([fetchRates(true), loadSyncStatuses()]); editingRate.value = rates.value.find((r: ExchangeRate) => r.code === 'VES') ?? null }
    else formError.value = res.message || 'Error al sincronizar'
  } catch (e: any) { formError.value = e?.data?.message ?? e.message }
  finally { syncing.value = false }
}

async function handleManualSyncFromTable(rate: ExchangeRate) {
  if (syncingCode.value) return; syncingCode.value = rate.code
  try {
    const res = await manualSync(rate.code)
    showToast(res.success ? `Sincronizado: 1 USD = ${res.rate} ${rate.code}` : res.message || 'Error')
    if (res.success) await Promise.all([fetchRates(true), loadSyncStatuses()])
  } catch (e: any) { showToast(e?.data?.message ?? 'Error al sincronizar') }
  finally { syncingCode.value = null }
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
const deletingRate      = ref<ExchangeRate | null>(null)
const settingDefaultRate = ref<ExchangeRate | null>(null)
const togglingRate      = ref<ExchangeRate | null>(null)

function handleDelete(rate: ExchangeRate)     { deletingRate.value = rate }
function handleSetDefault(rate: ExchangeRate) { settingDefaultRate.value = rate }
function handleToggle(rate: ExchangeRate)     { togglingRate.value = rate }

// ─── Historial de auditoría ───────────────────────────────────────────────────
const historyRate    = ref<ExchangeRate | null>(null)
const history         = ref<ExchangeRateHistoryEntry[]>([])
const loadingHistory  = ref(false)

async function openHistory(rate: ExchangeRate) {
  historyRate.value = rate
  loadingHistory.value = true
  history.value = []
  try {
    history.value = await fetchHistory(rate.id)
  } catch (e: any) {
    showToast(e?.data?.message ?? 'No se pudo cargar el historial')
  } finally {
    loadingHistory.value = false
  }
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  CREATE: 'Creación',
  BCV_SCRAPING: 'BCV (auto)',
  API_FALLBACK: 'API (auto)',
}
function sourceLabel(source: string) { return SOURCE_LABELS[source] ?? source }
function sourceBadgeClass(source: string) {
  if (source === 'MANUAL') return 'bg-blue-100 text-blue-700'
  if (source === 'CREATE') return 'bg-gray-100 text-gray-600'
  return 'bg-green-100 text-green-700'
}

async function confirmDelete() {
  if (!deletingRate.value) return; saving.value = true
  try { await deleteRate(deletingRate.value.id); await fetchStats(); showToast('Moneda eliminada'); deletingRate.value = null }
  catch (e: any) { error.value = e?.data?.message ?? e.message }
  finally { saving.value = false }
}

async function confirmSetDefault() {
  if (!settingDefaultRate.value) return; saving.value = true
  try { await setDefault(settingDefaultRate.value.id); await fetchStats(); showToast(`${settingDefaultRate.value.code} establecida como predeterminada`); settingDefaultRate.value = null }
  catch (e: any) { error.value = e?.data?.message ?? e.message }
  finally { saving.value = false }
}

async function confirmToggle() {
  if (!togglingRate.value) return; saving.value = true
  try { await toggleStatus(togglingRate.value.id); showToast(`${togglingRate.value.code} ${togglingRate.value.isActive ? 'desactivada' : 'activada'}`); togglingRate.value = null }
  catch (e: any) { error.value = e?.data?.message ?? e.message }
  finally { saving.value = false }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout>
function showToast(msg: string) { toast.value = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = null }, 3000) }

function formatDate(iso: string) { return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) }
function formatDateTime(iso: string) { return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

onMounted(async () => { await Promise.all([fetchRates(true), fetchStats(), loadSyncStatuses()]) })
</script>
