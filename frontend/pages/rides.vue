<template>
  <div>
    <PageHeader
      title="Corridas y Fletes"
      :description="subtitleText"
      :icon="TruckIcon"
      :breadcrumb="[{ label: 'Corridas y Fletes' }]"
      :stats="headerStats"
    >
      <template #actions>
        <div class="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
          <button
            v-if="canRequestCorrida"
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === 'request' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = 'request'"
          >Solicitar Viaje/Flete</button>
          <button
            v-if="canViewAvailableCorridas"
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === 'available' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = 'available'"
          >Disponibles</button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === 'history' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = 'history'"
          >{{ canManageCorridas ? 'Mis Asignaciones' : 'Mis Viajes' }}</button>
        </div>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="clearError">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!--  TAB: Solicitar Viaje                                      -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'request' && canRequestCorrida" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Formulario -->
      <div class="lg:col-span-2 space-y-4">
        <div class="card p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-5">{{ serviceType === 'FREIGHT' ? 'Nuevo Flete' : 'Nuevo Viaje' }}</h2>

          <form @submit.prevent="handleSubmitRequest" class="space-y-5">
            <!-- Tipo de servicio -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Servicio <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label
                  v-for="s in serviceTypeOptions"
                  :key="s.value"
                  class="flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-all"
                  :class="serviceType === s.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'"
                >
                  <input v-model="serviceType" type="radio" :value="s.value" class="hidden" />
                  <span class="text-2xl">{{ s.icon }}</span>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">{{ s.label }}</p>
                    <p class="text-xs text-gray-500">{{ s.desc }}</p>
                  </div>
                  <CheckCircleIcon v-if="serviceType === s.value" class="w-4 h-4 text-red-500 flex-shrink-0" />
                </label>
              </div>
            </div>

            <!-- Origen -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ serviceType === 'FREIGHT' ? 'Punto de Recogida' : 'Punto de Origen' }} <span class="text-red-500">*</span>
              </label>
              <PlaceAutocomplete
                v-model="originPlace"
                :placeholder="serviceType === 'FREIGHT' ? '¿Dónde recogemos la carga?' : '¿Desde dónde sales?'"
                :show-geo="true"
                @selected="onOriginSelected"
              >
                <template #icon>
                  <span class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">A</span>
                </template>
              </PlaceAutocomplete>
            </div>

            <!-- Destino -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ serviceType === 'FREIGHT' ? 'Punto de Entrega' : 'Destino' }} <span class="text-red-500">*</span>
              </label>
              <PlaceAutocomplete
                v-model="destinationPlace"
                :placeholder="serviceType === 'FREIGHT' ? '¿A dónde entregamos?' : '¿A dónde vas?'"
                @selected="onDestinationSelected"
              >
                <template #icon>
                  <span class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">B</span>
                </template>
              </PlaceAutocomplete>
            </div>

            <!-- Datos del destinatario (solo flete) -->
            <div v-if="serviceType === 'FREIGHT'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del destinatario</label>
                <input v-model="recipientName" type="text" placeholder="Quién recibe" class="input-field" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono del destinatario</label>
                <input v-model="recipientPhone" type="text" placeholder="Teléfono de contacto" class="input-field" />
              </div>
            </div>

            <!-- Carga (solo flete) -->
            <div v-if="serviceType === 'FREIGHT'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción de la carga</label>
                <input v-model="cargoDescription" type="text" placeholder="Ej: Caja de electrodomésticos" class="input-field" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Peso aproximado (kg)</label>
                  <input v-model.number="cargoWeight" type="number" min="0" step="0.1" placeholder="Ej: 25" class="input-field" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Valor declarado <span class="text-gray-400 font-normal">(opcional)</span></label>
                  <input v-model.number="declaredValue" type="number" min="0" step="0.01" placeholder="$" class="input-field" />
                </div>
              </div>
            </div>

            <!-- Tipo de Vehículo -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Vehículo <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label
                  v-for="v in currentVehicleOptions"
                  :key="v.value"
                  class="flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-all"
                  :class="vehicleType === v.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'"
                >
                  <input v-model="vehicleType" type="radio" :value="v.value" class="hidden" />
                  <span class="text-2xl">{{ v.icon }}</span>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">{{ v.label }}</p>
                    <p class="text-xs text-gray-500">{{ v.desc }}</p>
                  </div>
                  <CheckCircleIcon v-if="vehicleType === v.value" class="w-4 h-4 text-red-500 flex-shrink-0" />
                </label>
              </div>
            </div>

            <!-- Notas -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ serviceType === 'FREIGHT' ? 'Notas para el transportista' : 'Notas para el conductor' }} <span class="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                v-model="notes"
                rows="2"
                :placeholder="serviceType === 'FREIGHT' ? 'Ej: Tocar el timbre, preguntar por portería...' : 'Ej: Llevaré una maleta grande, portón verde...'"
                class="input-field resize-none"
              />
            </div>

            <!-- Precio estimado -->
            <Transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div v-if="priceEstimate || calculatingPrice" class="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4">
                <div v-if="calculatingPrice" class="flex items-center gap-3 text-gray-500">
                  <svg class="w-5 h-5 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <span class="text-sm">Calculando precio...</span>
                </div>
                <div v-else-if="priceEstimate" class="flex justify-between items-center">
                  <div class="space-y-1 text-sm text-gray-600">
                    <div class="flex items-center gap-2">
                      <ArrowTrendingUpIcon class="w-4 h-4 text-red-400" />
                      {{ priceEstimate.distance }} km
                    </div>
                    <div class="flex items-center gap-2">
                      <ClockIcon class="w-4 h-4 text-red-400" />
                      ~{{ priceEstimate.duration }} min
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-3xl font-bold text-red-600">${{ priceEstimate.price }}</p>
                    <p class="text-xs text-gray-400">precio estimado</p>
                  </div>
                </div>
              </div>
            </Transition>

            <!-- Botones -->
            <div class="flex gap-3 pt-1">
              <button
                type="button"
                @click="recalculatePrice"
                :disabled="calculatingPrice || !canCalculate"
                class="btn-secondary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ calculatingPrice ? 'Calculando...' : 'Recalcular Precio' }}
              </button>
              <button
                type="submit"
                :disabled="loading || !priceEstimate || !canSubmit"
                class="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ loading ? 'Solicitando...' : 'Solicitar Viaje' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Sidebar: Corrida activa -->
      <div class="space-y-4">
        <div v-if="activeCorrida && hasActiveCorrida" class="card overflow-hidden">
          <!-- Banner de estado -->
          <div
            class="px-5 py-4 text-white"
            :class="{
              'bg-gradient-to-r from-red-600 to-orange-500': activeCorrida.status === 'PENDING',
              'bg-gradient-to-r from-blue-600 to-blue-500': activeCorrida.status === 'ACCEPTED',
              'bg-gradient-to-r from-green-600 to-green-500': activeCorrida.status === 'IN_PROGRESS',
            }"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <MagnifyingGlassIcon v-if="activeCorrida.status === 'PENDING'" class="w-5 h-5 animate-pulse" />
                <CheckCircleIcon v-else-if="activeCorrida.status === 'ACCEPTED'" class="w-5 h-5" />
                <BoltIcon v-else class="w-5 h-5 animate-bounce" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm">
                  {{ activeCorrida.status === 'PENDING' ? 'Buscando motorista...' : activeCorrida.status === 'ACCEPTED' ? '¡Conductor en camino!' : '¡En curso!' }}
                </p>
                <p class="text-white/75 text-xs mt-0.5">{{ elapsedTime }} transcurrido</p>
              </div>
            </div>
            <div v-if="activeCorrida.status === 'PENDING'" class="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white/60 rounded-full w-3/5" style="animation: searching 2s ease-in-out infinite"></div>
            </div>
          </div>

          <div class="p-5 space-y-4">
            <span v-if="activeCorrida.serviceType === 'FREIGHT'" class="badge bg-amber-100 text-amber-800">📦 Flete</span>

            <!-- Ruta -->
            <div class="relative pl-5 space-y-3">
              <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
              <div class="flex items-start gap-3">
                <span class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10">A</span>
                <div>
                  <p class="text-[10px] text-gray-400">{{ activeCorrida.serviceType === 'FREIGHT' ? 'Recogida' : 'Origen' }}</p>
                  <p class="text-sm font-medium text-gray-900">{{ activeCorrida.origin }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <span class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10">B</span>
                <div>
                  <p class="text-[10px] text-gray-400">{{ activeCorrida.serviceType === 'FREIGHT' ? 'Entrega' : 'Destino' }}</p>
                  <p class="text-sm font-medium text-gray-900">{{ activeCorrida.destination }}</p>
                </div>
              </div>
            </div>

            <!-- Datos de carga (flete) -->
            <div v-if="activeCorrida.serviceType === 'FREIGHT' && (activeCorrida.recipientName || activeCorrida.cargoDescription)" class="p-3 bg-amber-50 rounded-xl text-xs text-gray-600 space-y-1">
              <p v-if="activeCorrida.recipientName"><span class="font-medium text-gray-700">Destinatario:</span> {{ activeCorrida.recipientName }} {{ activeCorrida.recipientPhone ? `· ${activeCorrida.recipientPhone}` : '' }}</p>
              <p v-if="activeCorrida.cargoDescription"><span class="font-medium text-gray-700">Carga:</span> {{ activeCorrida.cargoDescription }} {{ activeCorrida.cargoWeight ? `· ${activeCorrida.cargoWeight} kg` : '' }}</p>
            </div>

            <!-- Conductor -->
            <div v-if="activeCorrida.driverName" class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div class="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon class="w-5 h-5 text-red-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ activeCorrida.driverName }}</p>
                <p class="text-xs text-gray-500">{{ activeCorrida.driverPhone }}</p>
              </div>
              <p class="text-lg font-bold text-red-600 flex-shrink-0">${{ activeCorrida.price }}</p>
            </div>
            <div v-else class="flex justify-between items-center text-sm text-gray-500">
              <span>Precio estimado</span>
              <span class="text-xl font-bold text-red-600">${{ activeCorrida.price }}</span>
            </div>

            <button
              v-if="activeCorrida.status === 'PENDING'"
              @click="corridaToCancelId = activeCorrida.id; showCancelModal = true"
              :disabled="cancelling"
              class="w-full px-4 py-2.5 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {{ cancelling ? 'Cancelando...' : 'Cancelar Viaje' }}
            </button>
          </div>
        </div>

        <!-- Sin viaje activo -->
        <div v-else class="card p-5 text-center text-gray-400">
          <TruckIcon class="h-10 w-10 mx-auto mb-2 text-gray-200" />
          <p class="text-sm font-medium">Sin viaje activo</p>
          <p class="text-xs mt-1">Solicita un viaje para verlo aquí</p>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!--  TAB: Corridas Disponibles (conductor)                     -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'available' && canViewAvailableCorridas" class="space-y-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm text-gray-500">Corridas disponibles cerca de ti</p>
        <button @click="refreshAvailable" :disabled="loading" class="btn-secondary text-sm flex items-center gap-1.5">
          <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Actualizar
        </button>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="grid gap-4 sm:grid-cols-2">
        <div v-for="n in 4" :key="n" class="card p-5 animate-pulse space-y-3">
          <div class="skeleton h-4 w-24 rounded" />
          <div class="skeleton h-3 w-full rounded" />
          <div class="skeleton h-3 w-3/4 rounded" />
          <div class="skeleton h-9 w-full rounded-xl" />
        </div>
      </div>

      <div v-else-if="availableCorridas.length === 0" class="card p-12 text-center">
        <TruckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">No hay corridas disponibles</p>
        <p class="text-sm text-gray-400 mt-1">Vuelve a intentar en unos minutos</p>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <div v-for="corrida in availableCorridas" :key="corrida.id" class="card p-5 space-y-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <span v-if="corrida.serviceType === 'FREIGHT'" class="badge bg-amber-100 text-amber-800">📦 Flete</span>
              <span class="badge bg-gray-100 text-gray-700">{{ vehicleLabel(corrida.vehicleType) }}</span>
            </div>
            <div class="text-right">
              <p class="text-xl font-bold text-red-600">${{ corrida.price ?? '--' }}</p>
              <p class="text-xs text-gray-400">{{ timeAgo(corrida.createdAt) }}</p>
            </div>
          </div>

          <div class="relative pl-5 space-y-3">
            <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
            <div class="flex items-start gap-3">
              <span class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10">A</span>
              <p class="text-sm text-gray-700 leading-snug">{{ corrida.origin }}</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10">B</span>
              <p class="text-sm text-gray-700 leading-snug">{{ corrida.destination }}</p>
            </div>
          </div>

          <div v-if="corrida.serviceType === 'FREIGHT' && corrida.cargoDescription" class="text-xs text-gray-500">
            <span class="font-medium text-gray-700">Carga:</span> {{ corrida.cargoDescription }} {{ corrida.cargoWeight ? `· ${corrida.cargoWeight} kg` : '' }}
          </div>

          <div v-if="corrida.distance || corrida.duration" class="flex gap-4 text-xs text-gray-500">
            <span v-if="corrida.distance" class="flex items-center gap-1">
              <ArrowTrendingUpIcon class="w-3.5 h-3.5" /> {{ corrida.distance }} km
            </span>
            <span v-if="corrida.duration" class="flex items-center gap-1">
              <ClockIcon class="w-3.5 h-3.5" /> ~{{ corrida.duration }} min
            </span>
          </div>

          <button
            @click="handleAccept(corrida.id)"
            :disabled="acceptingId === corrida.id"
            class="btn-primary w-full disabled:opacity-50"
          >
            {{ acceptingId === corrida.id ? 'Aceptando...' : 'Aceptar Viaje' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!--  TAB: Historial / Mis Asignaciones                         -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'history'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-500">{{ historySubtitle }}</p>
          <button @click="refreshHistory" :disabled="loading" class="btn-secondary text-sm flex items-center gap-1.5">
            <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            Actualizar
          </button>
        </div>

        <div class="card divide-y divide-gray-100">
          <!-- Skeleton -->
          <template v-if="loading">
            <div v-for="n in 4" :key="n" class="p-4 flex items-center gap-4">
              <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="skeleton h-4 w-40 rounded" />
                <div class="skeleton h-3 w-56 rounded" />
              </div>
              <div class="skeleton h-6 w-16 rounded" />
            </div>
          </template>

          <div v-else-if="historyList.length === 0" class="p-12 text-center">
            <ClockIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500 font-medium">No tienes viajes registrados</p>
          </div>

          <template v-else>
            <div v-for="corrida in historyList" :key="corrida.id" class="p-4 hover:bg-gray-50 transition-colors">
              <div class="flex items-start gap-4">
                <!-- Icono estado -->
                <div
                  class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="{
                    'bg-yellow-100': corrida.status === 'PENDING',
                    'bg-blue-100':   corrida.status === 'ACCEPTED',
                    'bg-indigo-100': corrida.status === 'IN_PROGRESS',
                    'bg-green-100':  corrida.status === 'COMPLETED',
                    'bg-red-100':    corrida.status === 'CANCELLED',
                  }"
                >
                  <span class="text-lg">{{ vehicleEmoji(corrida.vehicleType) }}</span>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-0.5">
                    <span class="badge" :class="statusBadgeClass(corrida.status)">
                      {{ statusText(corrida.status) }}
                    </span>
                    <span v-if="corrida.serviceType === 'FREIGHT'" class="badge bg-amber-100 text-amber-800">📦 Flete</span>
                    <span v-if="corrida.driverName && !canManageCorridas" class="text-xs text-gray-400">
                      {{ corrida.serviceType === 'FREIGHT' ? 'Transportista' : 'Conductor' }}: {{ corrida.driverName }}
                    </span>
                    <span v-if="corrida.passengerName && canManageCorridas" class="text-xs text-gray-400">
                      {{ corrida.serviceType === 'FREIGHT' ? 'Remitente' : 'Pasajero' }}: {{ corrida.passengerName }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1 space-y-0.5">
                    <p class="flex items-center gap-1.5">
                      <span class="w-3 h-3 bg-green-500 rounded-full inline-block flex-shrink-0"></span>
                      {{ corrida.origin }}
                    </p>
                    <p class="flex items-center gap-1.5">
                      <span class="w-3 h-3 bg-red-500 rounded-full inline-block flex-shrink-0"></span>
                      {{ corrida.destination }}
                    </p>
                  </div>
                  <p v-if="corrida.serviceType === 'FREIGHT' && corrida.recipientName" class="text-[10px] text-gray-400 mt-1">
                    Destinatario: {{ corrida.recipientName }}
                  </p>
                  <p class="text-[10px] text-gray-400 mt-1.5">{{ formatDate(corrida.createdAt) }}</p>
                </div>

                <div class="flex-shrink-0 text-right space-y-2">
                  <p class="font-bold text-gray-900">${{ corrida.price ?? '--' }}</p>
                  <p v-if="canManageCorridas && corrida.platformFeePayer === 'PROVIDER' && corrida.platformFeeAmount" class="text-[10px] text-amber-600">
                    -${{ corrida.platformFeeAmount.toFixed(2) }} comisión
                  </p>

                  <!-- Acciones pasajero -->
                  <button
                    v-if="!canManageCorridas && corrida.status === 'PENDING'"
                    @click="corridaToCancelId = corrida.id; showCancelModal = true"
                    class="text-xs text-red-600 hover:underline"
                  >Cancelar</button>

                  <!-- Acciones conductor -->
                  <div v-if="canManageCorridas && (corrida.status === 'ACCEPTED' || corrida.status === 'IN_PROGRESS')" class="flex gap-1">
                    <button
                      v-if="corrida.status === 'ACCEPTED'"
                      @click="handleUpdateStatus(corrida.id, 'IN_PROGRESS')"
                      :disabled="updatingId === corrida.id"
                      class="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >Iniciar</button>
                    <button
                      v-if="corrida.status === 'IN_PROGRESS'"
                      @click="handleUpdateStatus(corrida.id, 'COMPLETED')"
                      :disabled="updatingId === corrida.id"
                      class="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >Completar</button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Sidebar historial -->
      <div class="space-y-4">
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Resumen</h3>
          <div class="space-y-3">
            <div v-for="s in historySummary" :key="s.status" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
                <span class="text-sm text-gray-600">{{ s.label }}</span>
              </div>
              <span class="text-sm font-bold text-gray-900">{{ s.count }}</span>
            </div>
          </div>
        </div>

        <div v-if="totalEarnings > 0 || canManageCorridas" class="card p-5 border-l-4 border-l-red-400">
          <p class="text-xs text-gray-500 mb-1">{{ canManageCorridas ? 'Ingresos totales' : 'Total gastado' }}</p>
          <p class="text-2xl font-black text-red-600">${{ formatPrice(totalEarnings) }}</p>
          <p class="text-xs text-gray-400 mt-1">en {{ historyList.length }} viaje{{ historyList.length !== 1 ? 's' : '' }}</p>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="toast.visible"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium"
          :class="{
            'bg-green-600': toast.type === 'success',
            'bg-red-600':   toast.type === 'error',
            'bg-amber-500': toast.type === 'warning',
            'bg-blue-600':  toast.type === 'info',
          }"
        >{{ toast.message }}</div>
      </Transition>
    </Teleport>

    <!-- Modal cancelar -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showCancelModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50" @click="showCancelModal = false"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div class="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-4">
              <ExclamationTriangleIcon class="w-7 h-7 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">¿Cancelar el viaje?</h3>
            <p class="text-sm text-gray-500 text-center mb-6">
              Llevas {{ elapsedTime }} esperando. Si cancelas ahora tendrás que solicitar uno nuevo.
            </p>
            <div class="flex gap-3">
              <button @click="showCancelModal = false" class="btn-secondary flex-1">
                Seguir esperando
              </button>
              <button
                @click="handleCancel(corridaToCancelId!)"
                :disabled="cancelling"
                class="btn-primary flex-1 disabled:opacity-50"
              >
                {{ cancelling ? 'Cancelando...' : 'Sí, cancelar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import {
  TruckIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  UserIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import type { PlaceSuggestion } from '~/composables/useNominatim'
import type { Ride } from '~/composables/useRides'

definePageMeta({ middleware: 'auth' })

const {
  corridas, myCorridas, activeCorrida, loading, error,
  hasActiveCorrida, canRequestCorrida, canManageCorridas,
  fetchAvailableCorridas, fetchMyCorridas, fetchDriverCorridas,
  createCorrida, acceptCorrida, updateCorridaStatus, cancelCorrida,
  calculatePrice, clearError,
} = useRides()

const { reloadPermissions, userCategory, userSubcategory } = usePermissions()

// ─── Estado local ─────────────────────────────────────────────────────────────
const activeTab        = ref('request')
const calculatingPrice = ref(false)
const priceEstimate    = ref<{ price: number; distance: number; duration: number } | null>(null)
const cancelling       = ref(false)
const acceptingId      = ref<string | null>(null)
const updatingId       = ref<string | null>(null)
const showCancelModal  = ref(false)
const corridaToCancelId = ref<string | null>(null)

const toast = reactive({ visible: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
let toastTimer: ReturnType<typeof setTimeout>
function showToast(type: typeof toast.type, message: string) {
  clearTimeout(toastTimer)
  toast.type = type; toast.message = message; toast.visible = true
  toastTimer = setTimeout(() => { toast.visible = false }, 3500)
}

const elapsedTime = ref('0:00')
let elapsedTimer: ReturnType<typeof setInterval> | null = null

function startElapsedTimer() {
  stopElapsedTimer()
  if (!activeCorrida.value) return
  const from = new Date(activeCorrida.value.createdAt).getTime()
  elapsedTimer = setInterval(() => {
    const secs = Math.floor((Date.now() - from) / 1000)
    const m = Math.floor(secs / 60); const s = secs % 60
    elapsedTime.value = `${m}:${s.toString().padStart(2, '0')}`
  }, 1000)
}
function stopElapsedTimer() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

watch(activeCorrida, (val: Ride | null) => {
  if (val && ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(val.status)) {
    startElapsedTimer()
  } else {
    stopElapsedTimer(); elapsedTime.value = '0:00'
  }
}, { immediate: true })

onUnmounted(stopElapsedTimer)

const originPlace      = ref<PlaceSuggestion | null>(null)
const destinationPlace = ref<PlaceSuggestion | null>(null)
const serviceType      = ref<'PASSENGER' | 'FREIGHT'>('PASSENGER')
const vehicleType      = ref<'MOTORCYCLE' | 'CAR' | 'PICKUP_TRUCK' | 'TRUCK'>('MOTORCYCLE')
const notes            = ref('')
const recipientName    = ref('')
const recipientPhone   = ref('')
const cargoDescription = ref('')
const cargoWeight      = ref<number | null>(null)
const declaredValue    = ref<number | null>(null)

const serviceTypeOptions = [
  { value: 'PASSENGER', icon: '🧍', label: 'Pasajero', desc: 'Viaje de persona a persona' },
  { value: 'FREIGHT',    icon: '📦', label: 'Flete / Entrega', desc: 'Transporte de carga o paquetes' },
]

const passengerVehicleOptions = [
  { value: 'MOTORCYCLE', icon: '🏍️', label: 'Moto', desc: 'Más rápido' },
  { value: 'CAR', icon: '🚗', label: 'Auto', desc: 'Más espacio' },
]

const fleteVehicleOptions = [
  { value: 'MOTORCYCLE',      icon: '🏍️', label: 'Moto',      desc: 'Paquetes pequeños' },
  { value: 'CAR',      icon: '🚗', label: 'Auto',      desc: 'Cargas medianas' },
  { value: 'PICKUP_TRUCK', icon: '🛻', label: 'Camioneta', desc: 'Cargas grandes' },
  { value: 'TRUCK',    icon: '🚚', label: 'Camión',    desc: 'Mudanzas y carga pesada' },
]

const currentVehicleOptions = computed(() => serviceType.value === 'FREIGHT' ? fleteVehicleOptions : passengerVehicleOptions)

watch(serviceType, () => {
  vehicleType.value = 'MOTORCYCLE'
  priceEstimate.value = null
  if (canCalculate.value) autoCalculatePrice()
})

// ─── Computados ───────────────────────────────────────────────────────────────
const canCalculate = computed(() => !!originPlace.value && !!destinationPlace.value)
const canSubmit    = computed(() => canCalculate.value && !!priceEstimate.value)

const TRANSPORTE_SUBCATEGORIES = ['carros', 'motos', 'Mudanzas', 'Delivery']

const canViewAvailableCorridas = computed(() =>
  userCategory.value === 'Transporte' &&
  TRANSPORTE_SUBCATEGORIES.includes(userSubcategory.value ?? '')
)

const availableCorridas = computed(() => corridas.value.filter((c: Ride) => c.status === 'PENDING'))
const historyList       = computed(() => canManageCorridas.value ? corridas.value : myCorridas.value)

const subtitleText = computed(() => {
  if (canManageCorridas.value && canRequestCorrida.value) return 'Solicita viajes, fletes o acepta corridas como conductor'
  if (canManageCorridas.value) return 'Gestiona corridas y fletes como conductor'
  return 'Solicita viajes y fletes rápidos y seguros'
})

const historySubtitle = computed(() =>
  canManageCorridas.value ? 'Tus asignaciones como conductor' : 'Tus viajes solicitados'
)

const totalEarnings = computed(() =>
  historyList.value.reduce((sum: number, c: Ride) => sum + (c.status === 'COMPLETED' ? (c.price ?? 0) : 0), 0)
)

const headerStats = computed(() => {
  const list = historyList.value as Ride[]
  return [
    { label: 'Total viajes',   value: String(list.length) },
    { label: 'Completados',    value: String(list.filter((c: Ride) => c.status === 'COMPLETED').length) },
    { label: 'Cancelados',     value: String(list.filter((c: Ride) => c.status === 'CANCELLED').length) },
    { label: canManageCorridas.value ? 'Ingresos' : 'Gastado',
      value: `$${formatPrice(totalEarnings.value)}` },
  ]
})

const historySummary = computed(() => [
  { status: 'PENDING',     label: 'Pendientes',   count: historyList.value.filter((c: Ride) => c.status === 'PENDING').length,     dot: 'bg-yellow-400' },
  { status: 'ACCEPTED',    label: 'Aceptados',    count: historyList.value.filter((c: Ride) => c.status === 'ACCEPTED').length,    dot: 'bg-blue-400'   },
  { status: 'IN_PROGRESS', label: 'En progreso',  count: historyList.value.filter((c: Ride) => c.status === 'IN_PROGRESS').length, dot: 'bg-indigo-400' },
  { status: 'COMPLETED',   label: 'Completados',  count: historyList.value.filter((c: Ride) => c.status === 'COMPLETED').length,   dot: 'bg-green-400'  },
  { status: 'CANCELLED',   label: 'Cancelados',   count: historyList.value.filter((c: Ride) => c.status === 'CANCELLED').length,   dot: 'bg-red-400'    },
])

watch(vehicleType, () => { if (canCalculate.value) autoCalculatePrice() })

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusText(status: string) {
  return ({ PENDING: 'Pendiente', ACCEPTED: 'Aceptado', IN_PROGRESS: 'En Progreso', COMPLETED: 'Completado', CANCELLED: 'Cancelado' })[status] ?? status
}

function statusBadgeClass(status: string) {
  return ({
    PENDING:     'bg-yellow-100 text-yellow-800',
    ACCEPTED:    'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    COMPLETED:   'bg-green-100 text-green-800',
    CANCELLED:   'bg-red-100 text-red-800',
  })[status] ?? 'bg-gray-100 text-gray-800'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return formatDate(d)
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(n)
}

const VEHICLE_EMOJI: Record<string, string> = { MOTORCYCLE: '🏍️', CAR: '🚗', PICKUP_TRUCK: '🛻', TRUCK: '🚚' }
const VEHICLE_LABEL: Record<string, string> = { MOTORCYCLE: 'Moto', CAR: 'Auto', PICKUP_TRUCK: 'Camioneta', TRUCK: 'Camión' }

function vehicleEmoji(v: string) {
  return VEHICLE_EMOJI[v] ?? '🚗'
}

function vehicleLabel(v: string) {
  return `${vehicleEmoji(v)} ${VEHICLE_LABEL[v] ?? v}`
}

// ─── Autocomplete ─────────────────────────────────────────────────────────────
function onOriginSelected(_: PlaceSuggestion) {
  priceEstimate.value = null
  if (destinationPlace.value) autoCalculatePrice()
}

function onDestinationSelected(_: PlaceSuggestion) {
  priceEstimate.value = null
  if (originPlace.value) autoCalculatePrice()
}

// ─── Precio ───────────────────────────────────────────────────────────────────
async function autoCalculatePrice() {
  if (!originPlace.value || !destinationPlace.value) return
  calculatingPrice.value = true
  priceEstimate.value = null
  try {
    priceEstimate.value = await calculatePrice(
      originPlace.value.lat, originPlace.value.lng,
      destinationPlace.value.lat, destinationPlace.value.lng,
      vehicleType.value
    )
  } catch { /* error en banner global */ } finally {
    calculatingPrice.value = false
  }
}

async function recalculatePrice() {
  priceEstimate.value = null
  await autoCalculatePrice()
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function handleSubmitRequest() {
  if (!originPlace.value || !destinationPlace.value) return
  if (!priceEstimate.value) {
    await autoCalculatePrice()
    if (!priceEstimate.value) return
  }
  try {
    await createCorrida({
      serviceType: serviceType.value,
      origin: originPlace.value.label,
      destination: destinationPlace.value.label,
      originLat: originPlace.value.lat,
      originLng: originPlace.value.lng,
      destinationLat: destinationPlace.value.lat,
      destinationLng: destinationPlace.value.lng,
      vehicleType: vehicleType.value,
      notes: notes.value,
      ...(serviceType.value === 'FREIGHT' ? {
        recipientName: recipientName.value || undefined,
        recipientPhone: recipientPhone.value || undefined,
        cargoDescription: cargoDescription.value || undefined,
        cargoWeight: cargoWeight.value ?? undefined,
        declaredValue: declaredValue.value ?? undefined,
      } : {}),
    })
    originPlace.value = null; destinationPlace.value = null
    notes.value = ''; priceEstimate.value = null
    recipientName.value = ''; recipientPhone.value = ''
    cargoDescription.value = ''; cargoWeight.value = null; declaredValue.value = null
    activeTab.value = 'history'
    refreshHistory()
  } catch { /* error en banner global */ }
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
async function handleCancel(id: string) {
  cancelling.value = true
  try {
    await cancelCorrida(id)
    showCancelModal.value = false; corridaToCancelId.value = null
    showToast('success', 'Viaje cancelado correctamente')
    await refreshHistory()
  } catch { showToast('error', 'No se pudo cancelar el viaje') }
  finally { cancelling.value = false }
}

async function handleAccept(id: string) {
  acceptingId.value = id
  try {
    await acceptCorrida(id)
    await refreshAvailable()
    activeTab.value = 'history'
  } finally { acceptingId.value = null }
}

async function handleUpdateStatus(id: string, status: 'IN_PROGRESS' | 'COMPLETED') {
  updatingId.value = id
  try { await updateCorridaStatus(id, status); await refreshHistory() }
  finally { updatingId.value = null }
}

async function refreshAvailable() { try { await fetchAvailableCorridas() } catch {} }

async function refreshHistory() {
  try {
    if (canManageCorridas.value) await fetchDriverCorridas()
    else await fetchMyCorridas()
  } catch {}
}

// ─── Ciclo de vida ────────────────────────────────────────────────────────────
onMounted(async () => {
  await reloadPermissions()
  await refreshHistory()
  if (!canRequestCorrida.value && canViewAvailableCorridas.value) activeTab.value = 'available'
  else if (!canRequestCorrida.value) activeTab.value = 'history'
  if (canViewAvailableCorridas.value) refreshAvailable()
})
</script>

<style scoped>
@keyframes searching {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(200%); }
}
</style>
