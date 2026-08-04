<template>
  <div>
    <PageHeader
      title="Configuración"
      description="Personaliza tu experiencia y gestiona las opciones del sistema"
      :icon="CogIcon"
    />

    <!-- ════════════════════════════════════════════════════════════════════
         VISTA SUPERADMIN / ADMIN / NORMAL — preferencias de usuario (sin backend)
         ════════════════════════════════════════════════════════════════════ -->
    <template v-if="!isCommerce">
      <!-- Toast -->
      <Teleport to="body">
        <Transition name="toast">
          <div
            v-if="userToast"
            class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-2xl"
          >
            <CheckCircleIcon class="h-4 w-4 text-green-400 flex-shrink-0" />
            {{ userToast }}
          </div>
        </Transition>
      </Teleport>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- ── Preferencias ───────────────────────────────────────────── -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg mr-3">
              <PaintBrushIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Preferencias</h3>
          </div>

          <div class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Idioma</label>
              <select v-model="userPrefs.language" class="input-field">
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Moneda preferida</label>
              <select v-model="userPrefs.currency" class="input-field">
                <option v-for="rate in activeRates" :key="rate.code" :value="rate.code">
                  {{ rate.code }} — {{ rate.name }}
                </option>
                <option v-if="activeRates.length === 0" disabled value="">Cargando monedas...</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Ordenar productos por defecto</label>
              <select v-model="userPrefs.defaultSort" class="input-field">
                <option value="relevance">Relevancia</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
                <option value="name">Nombre A–Z</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Productos por página</label>
              <select v-model.number="userPrefs.pageSize" class="input-field">
                <option :value="10">10 productos</option>
                <option :value="20">20 productos</option>
                <option :value="40">40 productos</option>
              </select>
            </div>

            <button class="btn-save btn-violet" @click="saveUserPrefs">
              Guardar Preferencias
            </button>
          </div>
        </div>

        <!-- ── Notificaciones usuario ─────────────────────────────────── -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg mr-3">
              <BellIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Notificaciones</h3>
          </div>

          <div class="space-y-3">
            <div
              v-for="n in userNotifItems"
              :key="n.key"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              <div>
                <div class="font-semibold text-gray-900">{{ n.title }}</div>
                <div class="text-sm text-gray-500">{{ n.description }}</div>
              </div>
              <button
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300',
                  userNotifs[n.key] ? 'bg-workplace-red' : 'bg-gray-300'
                ]"
                @click="toggleUserNotif(n.key)"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
                    userNotifs[n.key] ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>
          </div>
          <p class="mt-4 text-xs text-gray-400 text-center">Los cambios se guardan automáticamente</p>
        </div>

        <!-- ── Privacidad y Datos ─────────────────────────────────────── -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
              <ShieldCheckIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Privacidad y Datos</h3>
          </div>

          <div class="space-y-3">
            <div
              v-for="p in privacyItems"
              :key="p.key"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              <div>
                <div class="font-semibold text-gray-900">{{ p.title }}</div>
                <div class="text-sm text-gray-500">{{ p.description }}</div>
              </div>
              <button
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300',
                  userPrivacy[p.key] ? 'bg-workplace-red' : 'bg-gray-300'
                ]"
                @click="togglePrivacy(p.key)"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
                    userPrivacy[p.key] ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>
          </div>
          <p class="mt-4 text-xs text-gray-400 text-center">Los cambios se guardan automáticamente</p>
        </div>

        <!-- ── Datos locales ──────────────────────────────────────────── -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg mr-3">
              <CircleStackIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Datos Locales</h3>
          </div>

          <div class="space-y-4">
            <!-- Favoritos -->
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <div class="font-semibold text-gray-900">Productos favoritos</div>
                <div class="text-sm text-gray-500">
                  {{ favoritesCount }} producto{{ favoritesCount !== 1 ? 's' : '' }} guardado{{ favoritesCount !== 1 ? 's' : '' }}
                </div>
              </div>
              <button
                class="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                @click="clearFavorites"
              >
                Limpiar
              </button>
            </div>

            <!-- Caché -->
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <div class="font-semibold text-gray-900">Caché del catálogo</div>
                <div class="text-sm text-gray-500">Preferencias y filtros guardados</div>
              </div>
              <button
                class="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                @click="clearCache"
              >
                Limpiar
              </button>
            </div>

            <!-- Info -->
            <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p class="text-xs font-semibold text-blue-700 mb-1">¿Qué se guarda en tu dispositivo?</p>
              <p class="text-xs text-blue-600">Tus preferencias, favoritos y ajustes de notificaciones se almacenan localmente en tu navegador. Nunca se envían a servidores externos sin tu consentimiento.</p>
            </div>
          </div>
        </div>

        <!-- ── Acerca de (full width) ─────────────────────────────────── -->
        <div class="card-premium p-6 lg:col-span-2">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-lg mr-3">
              <InformationCircleIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Acerca de</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-4 bg-gray-50 rounded-xl text-center">
              <p class="text-xs text-gray-500 mb-1">Versión de la app</p>
              <p class="font-bold text-gray-900">WorkPlace Manager v1.0</p>
            </div>
            <div class="p-4 bg-gray-50 rounded-xl text-center">
              <p class="text-xs text-gray-500 mb-1">Tu cuenta</p>
              <p class="font-bold text-gray-900 truncate">{{ user?.email ?? '—' }}</p>
            </div>
            <div class="p-4 bg-gray-50 rounded-xl text-center">
              <p class="text-xs text-gray-500 mb-1">Rol</p>
              <p class="font-bold text-gray-900">{{ roleLabel }}</p>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-3">
            <span class="text-sm text-gray-500 font-medium self-center">Soporte:</span>
            <a href="mailto:soporte@workplace-manager.app" class="text-sm text-workplace-red hover:underline font-medium">soporte@workplace-manager.app</a>
            <span class="text-gray-300">|</span>
            <span class="text-sm text-gray-500">© 2026 WorkPlace Manager. Todos los derechos reservados.</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ════════════════════════════════════════════════════════════════════
         VISTA COMMERCE / FREELANCER — configuración del negocio (backend)
         ════════════════════════════════════════════════════════════════════ -->
    <template v-else>
      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div v-for="i in 4" :key="i" class="card-premium p-6 animate-pulse">
          <div class="h-6 bg-gray-200 rounded-lg w-1/2 mb-6" />
          <div class="space-y-4">
            <div class="h-10 bg-gray-200 rounded-xl" />
            <div class="h-10 bg-gray-200 rounded-xl" />
            <div class="h-10 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>

      <!-- Error banner -->
      <div
        v-if="error"
        class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
      >
        <ExclamationTriangleIcon class="h-5 w-5 flex-shrink-0" />
        <span class="text-sm font-medium">{{ error }}</span>
        <button class="ml-auto text-red-400 hover:text-red-600" @click="error = null">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>

      <!-- Success banner -->
      <Transition name="fade">
        <div
          v-if="successMsg"
          class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700"
        >
          <CheckCircleIcon class="h-5 w-5 flex-shrink-0" />
          <span class="text-sm font-medium">{{ successMsg }}</span>
        </div>
      </Transition>

      <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- ── Información del Comercio (solo COMMERCE: un freelancer no tiene negocio físico) ── -->
        <div v-if="!isFreelancer" class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
              <BuildingStorefrontIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Información del Comercio</h3>
          </div>

          <div class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre del Comercio</label>
              <input v-model="commerceForm.name" type="text" class="input-field" placeholder="Mi Comercio">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Tipo de Establecimiento</label>
              <input v-model="commerceForm.type" type="text" class="input-field" placeholder="Restaurante, Tienda, Servicio...">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
              <input v-model="commerceForm.address" type="text" class="input-field" placeholder="Av. Principal 123, Col. Centro">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                <input v-model="commerceForm.phone" type="tel" class="input-field" placeholder="+52 123 456 7890">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input v-model="commerceForm.email" type="email" class="input-field" placeholder="contacto@micomercio.com">
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">País</label>
                <SearchableSelect
                  v-model="commerceForm.country"
                  :options="countryNames"
                  placeholder="Ej: Venezuela"
                  @update:model-value="onSettingsCountryChange"
                />
              </div>

              <!-- Venezuela: Estado → Municipio → Ciudad en cascada contra el catálogo VE -->
              <template v-if="isVenezuelaSettings">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                  <SearchableSelect
                    v-model="commerceForm.state"
                    :options="veStates"
                    placeholder="Selecciona un estado"
                    @update:model-value="onSettingsStateChange"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Municipio</label>
                  <SearchableSelect
                    v-model="commerceForm.municipality"
                    :options="veMunicipios.map(m => m.name)"
                    :disabled="!commerceForm.state"
                    placeholder="Selecciona un municipio"
                    @update:model-value="onSettingsMunicipalityChange"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
                  <SearchableSelect
                    v-model="commerceForm.city"
                    :options="veCiudades.map(c => c.name)"
                    :disabled="!commerceForm.municipality"
                    placeholder="Selecciona una ciudad"
                    @update:model-value="onSettingsCityChange"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Parroquia <span class="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <SearchableSelect
                    v-model="commerceForm.parish"
                    :options="veParroquias.map(p => p.name)"
                    :disabled="!commerceForm.city"
                    placeholder="Selecciona una parroquia"
                  />
                </div>
              </template>
              <template v-else>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Estado / Provincia</label>
                  <input v-model="commerceForm.state" type="text" class="input-field" placeholder="Ej: Miranda">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
                  <input v-model="commerceForm.city" type="text" class="input-field" placeholder="Ej: Caracas">
                </div>
              </template>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Horario de Atención</label>
              <textarea
                v-model="commerceForm.schedule"
                rows="3"
                class="input-field resize-none"
                placeholder="Lunes a Viernes: 9:00 - 22:00&#10;Sábados y Domingos: 10:00 - 23:00"
              />
            </div>
            <button :disabled="saving === 'commerce'" class="btn-save btn-blue" @click="handleSaveCommerce">
              <span v-if="saving === 'commerce'" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Guardando...
              </span>
              <span v-else>Guardar Información</span>
            </button>
          </div>
        </div>

        <!-- ── Notificaciones ─────────────────────────────────────────── -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg mr-3">
              <BellIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Notificaciones</h3>
          </div>
          <div class="space-y-3">
            <div
              v-for="notif in notificationItems"
              :key="notif.key"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              <div>
                <div class="font-semibold text-gray-900">{{ notif.title }}</div>
                <div class="text-sm text-gray-500">{{ notif.description }}</div>
              </div>
              <button
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300',
                  notifForm[notif.key] ? 'bg-workplace-red' : 'bg-gray-300'
                ]"
                @click="toggleAndSaveNotification(notif.key)"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
                    notifForm[notif.key] ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>
          </div>
          <p class="mt-4 text-xs text-gray-400 text-center">Los cambios se guardan automáticamente</p>
        </div>

        <!-- ── Configuración de Pagos ─────────────────────────────────── -->
        <div v-if="isComidaCategory" class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg mr-3">
              <CurrencyDollarIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Configuración de Pagos</h3>
          </div>
          <div class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Moneda</label>
              <select v-model="paymentForm.currency" class="input-field">
                <option v-for="rate in activeRates" :key="rate.code" :value="rate.code">
                  {{ rate.code }} — {{ rate.name }}
                </option>
                <option v-if="activeRates.length === 0" disabled value="">Cargando monedas...</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Impuesto (%)</label>
                <input v-model.number="paymentForm.tax" type="number" min="0" max="100" step="0.01" class="input-field">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Propina Sugerida (%)</label>
                <input v-model.number="paymentForm.suggestedTip" type="number" min="0" max="100" step="0.01" class="input-field">
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">Métodos de Pago Aceptados</label>
              <div class="space-y-2">
                <div
                  v-for="method in paymentMethodOptions"
                  :key="method.id"
                  class="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  @click="togglePaymentMethod(method.id)"
                >
                  <div
                    :class="[
                      'h-5 w-5 rounded border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors',
                      paymentForm.paymentMethods.includes(method.id) ? 'bg-workplace-red border-workplace-red' : 'bg-white border-gray-300'
                    ]"
                  >
                    <CheckIcon v-if="paymentForm.paymentMethods.includes(method.id)" class="h-3 w-3 text-white" />
                  </div>
                  <span class="text-gray-900 font-medium">{{ method.name }}</span>
                </div>
              </div>
            </div>
            <button :disabled="saving === 'payment'" class="btn-save btn-yellow" @click="handleSavePayment">
              <span v-if="saving === 'payment'" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Guardando...
              </span>
              <span v-else>Guardar Configuración de Pagos</span>
            </button>
          </div>
        </div>

        <!-- ── Operaciones ────────────────────────────────────────────── -->
        <div v-if="isComidaCategory" class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg mr-3">
              <ClockIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Operaciones</h3>
          </div>
          <div class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Tiempo Prep. (min)</label>
                <input v-model.number="operationForm.avgPrepTime" type="number" min="1" class="input-field">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Tiempo Entrega (min)</label>
                <input v-model.number="operationForm.avgDeliveryTime" type="number" min="1" class="input-field">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Costo de Envío ($)</label>
                <input v-model.number="operationForm.deliveryFee" type="number" min="0" step="0.01" class="input-field">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Envío Gratis desde ($)</label>
                <input v-model.number="operationForm.freeDeliveryMinimum" type="number" min="0" step="0.01" class="input-field">
              </div>
            </div>
            <div class="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p class="text-xs font-semibold text-orange-700 mb-2">Resumen de operaciones</p>
              <div class="grid grid-cols-2 gap-2 text-xs text-orange-600">
                <span>Prep promedio: <strong>{{ operationForm.avgPrepTime }} min</strong></span>
                <span>Entrega promedio: <strong>{{ operationForm.avgDeliveryTime }} min</strong></span>
                <span>Costo envío: <strong>${{ operationForm.deliveryFee }}</strong></span>
                <span>Gratis desde: <strong>${{ operationForm.freeDeliveryMinimum }}</strong></span>
              </div>
            </div>
            <button :disabled="saving === 'operations'" class="btn-save btn-orange" @click="handleSaveOperations">
              <span v-if="saving === 'operations'" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Guardando...
              </span>
              <span v-else>Guardar Configuración de Operaciones</span>
            </button>
          </div>
        </div>

        <!-- ── Financiamiento (Cashea / Krece) ────────────────────────── -->
        <BnplSettingsSection />
      </div>
    </template>

    <!-- ════════════════════════════════════════════════════════════════════
         SEGURIDAD — 2FA, disponible para todos los roles
         ════════════════════════════════════════════════════════════════════ -->
    <div class="mt-6">
      <TwoFactorSettings />
    </div>

    <!-- ════════════════════════════════════════════════════════════════════
         APP LOCK — disponible para todos los roles en app nativa
         ════════════════════════════════════════════════════════════════════ -->
    <div v-if="showAppLockCard" class="card-premium p-6 mt-6">
      <div class="flex items-center mb-6">
        <div class="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg mr-3">
          <LockClosedIcon class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-gray-900">Bloqueo de la App</h3>
      </div>

      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
        <div>
          <div class="font-semibold text-gray-900">Solicitar {{ biometryLabel }} al abrir la app</div>
          <div class="text-sm text-gray-500">Protege tu sesión con tu huella o rostro cada vez que vuelvas a abrir la app</div>
        </div>
        <button
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 flex-shrink-0',
            appLockEnabled ? 'bg-workplace-red' : 'bg-gray-300'
          ]"
          @click="toggleAppLock"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
              appLockEnabled ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
      <p class="mt-4 text-xs text-gray-400 text-center">Esta preferencia se guarda solo en este dispositivo</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, watch, onMounted } from 'vue'
import {
  CogIcon,
  BuildingStorefrontIcon,
  BellIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckCircleIcon,
  CheckIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  InformationCircleIcon,
  LockClosedIcon,
} from '@heroicons/vue/24/outline'
import { BiometryType } from '@aparajita/capacitor-biometric-auth'
import PageHeader from '~/components/ui/PageHeader.vue'
import SearchableSelect from '~/components/ui/SearchableSelect.vue'
import TwoFactorSettings from '~/components/settings/TwoFactorSettings.vue'
import BnplSettingsSection from '~/components/settings/BnplSettingsSection.vue'
import { useSettings, type CommerceSettings, type FreelancerSettingsData } from '~/composables/useSettings'
import { useAuth } from '~/composables/useAuth'
import { usePermissions } from '~/composables/usePermissions'
import { useUserPreferences } from '~/composables/useUserPreferences'
import { useBiometric } from '~/composables/useBiometric'
import { useVeLocations, type VeMunicipio, type VeCiudad } from '~/composables/useVeLocations'
import { useLocationData } from '~/composables/useLocationData'

const { user } = useAuth()
const { userCategory } = usePermissions()
const role = computed(() => user.value?.role ?? 'NORMAL')
// Solo COMMERCE y FREELANCER tienen un negocio propio con configuración de backend
const isCommerce = computed(() => ['COMMERCE', 'FREELANCER'].includes(role.value))
// Un freelancer es proveedor de servicios independiente: sin Commerce, sin
// campos de comercio físico (dirección, horario, tax, delivery, etc.)
const isFreelancer = computed(() => role.value === 'FREELANCER')
// Solo usuarios de categoría "Comida" pueden ver Operaciones y Configuración de Pagos
const isComidaCategory = computed(() => userCategory.value === 'Comida')
const roleLabel = computed(() => {
  const labels: Record<string, string> = {
    SUPERADMIN: 'Super Administrador',
    ADMIN: 'Administrador',
    COMMERCE: 'Comercio',
    FREELANCER: 'Freelancer',
    NORMAL: 'Usuario',
  }
  return labels[role.value] ?? role.value
})

// ─── User preferences (singleton — shared with all formatCurrency callers) ────

const { prefs: userPrefs, activeRates, fetchRates, savePreferences } = useUserPreferences()

// ─── COMMERCE settings (backend) ─────────────────────────────────────────────

const {
  commerce,
  settings,
  loading,
  saving,
  error,
  successMsg,
  loadSettings,
  saveCommerceInfo,
  savePaymentSettings,
  saveOperationSettings,
  saveNotificationSettings,
} = useSettings()

const commerceForm = ref({ name: '', type: '', address: '', phone: '', email: '', schedule: '', country: '', state: '', city: '', municipality: '', parish: '' })

// ─── Ubicación: catálogo VE en cascada Estado→Municipio→Ciudad→Parroquia ─────
const { getCountries } = useLocationData()
const { getStates: getVeStates, getMunicipios: getVeMunicipios, getCiudades: getVeCiudades, getParroquias: getVeParroquias } = useVeLocations()

const countryNames = ref<string[]>([])
const isVenezuelaSettings = computed(() => commerceForm.value.country.trim().toLowerCase() === 'venezuela')

const veStates = ref<string[]>([])
const veMunicipios = ref<VeMunicipio[]>([])
const veCiudades = ref<VeCiudad[]>([])
const veParroquias = ref<{ id: string; name: string; postalCode: string | null }[]>([])

async function loadVeMunicipios(state: string) {
  veMunicipios.value = state ? await getVeMunicipios(state) : []
}

async function loadVeCiudades(municipioName: string) {
  veCiudades.value = []
  const municipio = veMunicipios.value.find((m) => m.name === municipioName)
  if (municipio) veCiudades.value = await getVeCiudades(municipio.id)
}

async function loadVeParroquias(ciudadName: string) {
  veParroquias.value = []
  const ciudad = veCiudades.value.find((c) => c.name === ciudadName)
  if (ciudad) veParroquias.value = await getVeParroquias(ciudad.id)
}

function onSettingsCountryChange() {
  if (!isVenezuelaSettings.value) return
  commerceForm.value.state = ''
  commerceForm.value.municipality = ''
  commerceForm.value.city = ''
  commerceForm.value.parish = ''
}

function onSettingsStateChange() {
  commerceForm.value.municipality = ''
  commerceForm.value.city = ''
  commerceForm.value.parish = ''
}

function onSettingsMunicipalityChange() {
  commerceForm.value.city = ''
  commerceForm.value.parish = ''
}

function onSettingsCityChange() {
  commerceForm.value.parish = ''
}

watch(isVenezuelaSettings, (isVe) => {
  if (isVe && veStates.value.length === 0) {
    getVeStates().then((s) => { veStates.value = s })
  }
}, { immediate: true })

watch(() => commerceForm.value.state, (state) => {
  if (isVenezuelaSettings.value && state) loadVeMunicipios(state)
})

watch(() => commerceForm.value.municipality, (municipality) => {
  if (isVenezuelaSettings.value && municipality) loadVeCiudades(municipality)
})

watch(() => commerceForm.value.city, (city) => {
  if (isVenezuelaSettings.value && city) loadVeParroquias(city)
})

const paymentForm = ref({ currency: 'MXN', tax: 16, suggestedTip: 10, paymentMethods: ['cash', 'card', 'transfer'] as string[] })
const operationForm = ref({ avgPrepTime: 20, avgDeliveryTime: 30, deliveryFee: 35, freeDeliveryMinimum: 200 })
const notifForm = ref<Record<string, boolean>>({ notifyNewOrders: true, notifyLowStock: true, notifyDailyReports: false, notifyCustomerReviews: true })

const paymentMethodOptions = [
  { id: 'cash', name: 'Efectivo' },
  { id: 'card', name: 'Tarjeta de Crédito/Débito' },
  { id: 'transfer', name: 'Transferencia Bancaria' },
  { id: 'digital-wallet', name: 'Monedero Digital' },
]

const commerceNotificationItems = [
  { key: 'notifyNewOrders', title: 'Nuevos Pedidos', description: 'Recibir notificaciones de pedidos nuevos' },
  { key: 'notifyLowStock', title: 'Stock Bajo', description: 'Alertas cuando productos están por agotarse' },
  { key: 'notifyDailyReports', title: 'Reportes Diarios', description: 'Recibir resumen diario de ventas' },
  { key: 'notifyCustomerReviews', title: 'Reseñas de Clientes', description: 'Notificaciones de nuevas reseñas' },
]

const freelancerNotificationItems = [
  { key: 'notifyNewRequests', title: 'Nuevas Solicitudes', description: 'Recibir notificaciones cuando un cliente solicita tu servicio' },
  { key: 'notifyRequestUpdates', title: 'Actualizaciones de Solicitudes', description: 'Cambios de estado en tus solicitudes activas' },
  { key: 'notifyDailyReports', title: 'Reportes Diarios', description: 'Recibir resumen diario de tu actividad' },
  { key: 'notifyCustomerReviews', title: 'Reseñas de Clientes', description: 'Notificaciones de nuevas reseñas' },
]

const notificationItems = computed(() => isFreelancer.value ? freelancerNotificationItems : commerceNotificationItems)

function syncForms() {
  if (commerce.value) {
    commerceForm.value = {
      name: commerce.value.name ?? '',
      type: commerce.value.type ?? '',
      address: commerce.value.address ?? '',
      phone: commerce.value.phone ?? '',
      email: commerce.value.email ?? '',
      schedule: commerce.value.schedule ?? '',
      country: commerce.value.country ?? '',
      state: commerce.value.state ?? '',
      city: commerce.value.city ?? '',
      municipality: commerce.value.municipality ?? '',
      parish: commerce.value.parish ?? '',
    }
  }
  if (settings.value) {
    if (isFreelancer.value) {
      const s = settings.value as FreelancerSettingsData
      paymentForm.value = { ...paymentForm.value, currency: s.currency }
      notifForm.value = {
        notifyNewRequests: s.notifyNewRequests,
        notifyRequestUpdates: s.notifyRequestUpdates,
        notifyDailyReports: s.notifyDailyReports,
        notifyCustomerReviews: s.notifyCustomerReviews,
      }
      return
    }

    const s = settings.value as CommerceSettings
    paymentForm.value = {
      currency: s.currency,
      tax: s.tax,
      suggestedTip: s.suggestedTip,
      paymentMethods: [...s.paymentMethods],
    }
    operationForm.value = {
      avgPrepTime: s.avgPrepTime,
      avgDeliveryTime: s.avgDeliveryTime,
      deliveryFee: s.deliveryFee,
      freeDeliveryMinimum: s.freeDeliveryMinimum,
    }
    notifForm.value = {
      notifyNewOrders: s.notifyNewOrders,
      notifyLowStock: s.notifyLowStock,
      notifyDailyReports: s.notifyDailyReports,
      notifyCustomerReviews: s.notifyCustomerReviews,
    }
  }
}

watch([commerce, settings], syncForms)

async function handleSaveCommerce() { await saveCommerceInfo({ ...commerceForm.value }) }
async function handleSavePayment() { await savePaymentSettings({ ...paymentForm.value }) }
async function handleSaveOperations() { await saveOperationSettings({ ...operationForm.value }) }
function togglePaymentMethod(id: string) {
  const idx = paymentForm.value.paymentMethods.indexOf(id)
  if (idx === -1) paymentForm.value.paymentMethods.push(id)
  else paymentForm.value.paymentMethods.splice(idx, 1)
}
async function toggleAndSaveNotification(key: keyof typeof notifForm.value) {
  notifForm.value[key] = !notifForm.value[key]
  await saveNotificationSettings({ ...notifForm.value })
}

// ─── NORMAL / FREELANCER settings (localStorage only) ────────────────────────

const LS_PREFS = 'user_preferences'
const LS_NOTIFS = 'user_notifications'
const LS_PRIVACY = 'user_privacy'

const userToast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showUserToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer)
  userToast.value = msg
  toastTimer = setTimeout(() => { userToast.value = null }, 2800)
}

function lsGet<T>(key: string, fallback: T): T {
  if (!process.client) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function lsSet(key: string, val: unknown) {
  if (process.client) localStorage.setItem(key, JSON.stringify(val))
}

// userPrefs comes from useUserPreferences (singleton) — already declared above
const userNotifs = ref(lsGet(LS_NOTIFS, { promotions: true, newProducts: true, priceAlerts: false, recommendations: true }))
const userPrivacy = ref(lsGet(LS_PRIVACY, { shareActivity: false, personalizedAds: false, analyticsConsent: true }))

const favoritesCount = computed(() => {
  if (!process.client) return 0
  try {
    const raw = localStorage.getItem('catalog_favorites')
    return raw ? (JSON.parse(raw) as string[]).length : 0
  } catch { return 0 }
})

const userNotifItems = [
  { key: 'promotions' as const, title: 'Promociones', description: 'Ofertas y descuentos de comercios' },
  { key: 'newProducts' as const, title: 'Nuevos productos', description: 'Cuando se añadan productos de tus favoritos' },
  { key: 'priceAlerts' as const, title: 'Alertas de precio', description: 'Cambios en precios de productos que sigues' },
  { key: 'recommendations' as const, title: 'Recomendaciones', description: 'Sugerencias personalizadas basadas en tu actividad' },
]

const privacyItems = [
  { key: 'shareActivity' as const, title: 'Compartir actividad', description: 'Permitir que tu actividad mejore el catálogo' },
  { key: 'personalizedAds' as const, title: 'Anuncios personalizados', description: 'Ver anuncios relevantes a tus intereses' },
  { key: 'analyticsConsent' as const, title: 'Análisis de uso', description: 'Ayudarnos a mejorar la app con datos anónimos' },
]

function saveUserPrefs() {
  savePreferences({ ...userPrefs.value })
  showUserToast('Preferencias guardadas')
}

function toggleUserNotif(key: keyof typeof userNotifs.value) {
  userNotifs.value[key] = !userNotifs.value[key]
  lsSet(LS_NOTIFS, userNotifs.value)
}

function togglePrivacy(key: keyof typeof userPrivacy.value) {
  userPrivacy.value[key] = !userPrivacy.value[key]
  lsSet(LS_PRIVACY, userPrivacy.value)
}

function clearFavorites() {
  if (process.client) localStorage.removeItem('catalog_favorites')
  showUserToast('Favoritos eliminados')
}

function clearCache() {
  if (!process.client) return
  const keep = ['auth_user', 'auth_access_token', 'auth_refresh_token', LS_PREFS, LS_NOTIFS, LS_PRIVACY, 'app_lock_enabled']
  Object.keys(localStorage).forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k) })
  showUserToast('Caché limpiado')
}

// ─── App Lock (biometría) ─────────────────────────────────────────────────────

const { isNative, isAvailable: isBiometryAvailable, getBiometryType, isAppLockEnabled, setAppLockEnabled } = useBiometric()

const showAppLockCard = ref(false)
const appLockEnabled = ref(false)
const biometryType = ref(BiometryType.none)

const biometryLabel = computed(() => {
  switch (biometryType.value) {
    case BiometryType.faceId:
    case BiometryType.faceAuthentication:
      return 'reconocimiento facial'
    case BiometryType.touchId:
    case BiometryType.fingerprintAuthentication:
      return 'huella digital'
    case BiometryType.irisAuthentication:
      return 'reconocimiento de iris'
    default:
      return 'verificación biométrica'
  }
})

async function toggleAppLock() {
  const enabled = !appLockEnabled.value
  setAppLockEnabled(enabled)
  appLockEnabled.value = enabled
  showUserToast(enabled ? 'Bloqueo de app activado' : 'Bloqueo de app desactivado')
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  getCountries().then((countries) => { countryNames.value = countries.map((c) => c.name) })
  await fetchRates(false, true)
  if (isCommerce.value) {
    await loadSettings()
    syncForms()
  }

  if (isNative) {
    showAppLockCard.value = await isBiometryAvailable()
    if (showAppLockCard.value) {
      biometryType.value = await getBiometryType()
      appLockEnabled.value = isAppLockEnabled()
    }
  }
})
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white;
}

.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}

.btn-blue   { @apply bg-gradient-to-r from-blue-500 to-blue-600; }
.btn-yellow { @apply bg-gradient-to-r from-yellow-500 to-yellow-600; }
.btn-orange { @apply bg-gradient-to-r from-orange-500 to-orange-600; }
.btn-violet { @apply bg-gradient-to-r from-violet-500 to-violet-600; }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

.toast-enter-active,
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(1rem); }
</style>
