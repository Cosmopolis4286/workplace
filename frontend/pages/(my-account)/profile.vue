<template>
  <div>
    <PageHeader
      title="Mi Perfil"
      description="Gestiona tu información personal y preferencias"
      :icon="UserCircleIcon"
    >
      <template v-if="canSeeSettings" #actions>
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:border-workplace-red/30 hover:text-workplace-red transition-all duration-200"
        >
          <Cog6ToothIcon class="h-5 w-5" />
          Ir a Configuración
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Loading skeleton -->
    <div v-if="loadingProfile" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="card-premium p-6 animate-pulse">
        <div class="flex flex-col items-center space-y-4">
          <div class="h-32 w-32 bg-gray-200 rounded-full" />
          <div class="h-6 w-40 bg-gray-200 rounded" />
          <div class="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
      <div class="lg:col-span-2 space-y-6">
        <div class="card-premium p-6 animate-pulse space-y-4">
          <div class="h-6 w-48 bg-gray-200 rounded" />
          <div class="grid grid-cols-2 gap-4">
            <div v-for="i in 4" :key="i" class="h-12 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Sidebar: avatar + meta -->
      <div class="lg:col-span-1">
        <div class="card-premium p-6">
          <div class="text-center">
            <div class="relative inline-block mb-4">
              <!-- Avatar image or initials -->
              <div class="h-32 w-32 rounded-full shadow-xl ring-4 ring-white overflow-hidden mx-auto">
                <img
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  alt="Foto de perfil"
                  class="h-full w-full object-cover"
                >
                <div
                  v-else
                  class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center"
                >
                  <span class="text-4xl font-bold text-white select-none">{{ userInitials }}</span>
                </div>
              </div>

              <!-- Upload button overlay -->
              <button
                type="button"
                :disabled="uploadingAvatar"
                @click="triggerAvatarInput"
                class="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60"
                title="Cambiar foto"
              >
                <span v-if="uploadingAvatar" class="h-4 w-4 border-2 border-workplace-red border-t-transparent rounded-full animate-spin" />
                <CameraIcon v-else class="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ fullName }}</h2>
            <p class="text-gray-500 mb-2 text-sm">{{ auth.user.value?.email }}</p>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" :class="roleStyle.badge">
              {{ roleStyle.label }}
            </span>
            <NuxtLink
              to="/verification"
              class="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
              :class="kycBadge.class"
            >
              <component :is="kycBadge.icon" class="h-3.5 w-3.5" />
              {{ kycBadge.label }}
            </NuxtLink>
            <div v-if="auth.user.value?.username && (isCommerce || auth.user.value?.role === 'FREELANCER')" class="mt-3">
              <NuxtLink
                :to="`/p/${auth.user.value.username}`"
                class="inline-flex items-center gap-1.5 text-sm text-workplace-red hover:underline font-medium"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Ver perfil público
              </NuxtLink>
            </div>
            <p v-else-if="isCommerce || auth.user.value?.role === 'FREELANCER'" class="mt-2 text-xs text-gray-400">
              Define un <span class="font-medium">@username</span> para activar tu perfil público
            </p>
          </div>

          <div class="mt-6 pt-6 border-t border-gray-200 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Estado</span>
              <span class="inline-flex items-center gap-1.5 font-semibold text-green-700">
                <span class="h-2 w-2 bg-green-500 rounded-full" />
                Activo
              </span>
            </div>
            <div v-if="isCommerce" class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Comercio</span>
              <span class="font-semibold text-gray-900 truncate max-w-[120px]" :title="auth.commerce.value?.name">
                {{ auth.commerce.value?.name ?? '—' }}
              </span>
            </div>
            <div v-if="auth.user.value?.phone" class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Teléfono</span>
              <span class="font-semibold text-gray-900">{{ auth.user.value.phone }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main content -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Success / Error banners -->
        <transition name="fade">
          <div v-if="successMsg" class="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
            <CheckCircleIcon class="h-5 w-5 flex-shrink-0" />
            {{ successMsg }}
          </div>
        </transition>
        <transition name="fade">
          <div v-if="errorMsg" class="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium">
            <ExclamationCircleIcon class="h-5 w-5 flex-shrink-0" />
            {{ errorMsg }}
          </div>
        </transition>

        <!-- Personal Information -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
              <UserCircleIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Información Personal</h3>
          </div>

          <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
                  {{ profileForm.firstName || '—' }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Apellido</label>
                <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
                  {{ profileForm.lastName || '—' }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
                  {{ profileForm.email || '—' }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
                  {{ profileForm.phone || '—' }}
                </div>
              </div>
            </div>

            <!-- Ubicación — todos los usuarios -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">País</label>
                <SearchableSelect
                  v-model="profileForm.country"
                  :options="countryNames"
                  placeholder="Ej: Venezuela"
                  @update:model-value="onProfileCountryChange"
                />
              </div>

              <!-- Venezuela: Estado → Municipio → Ciudad en cascada contra el catálogo VE -->
              <template v-if="isVenezuelaProfile">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                  <SearchableSelect
                    v-model="profileForm.state"
                    :options="veStates"
                    placeholder="Selecciona un estado"
                    @update:model-value="onProfileStateChange"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Municipio</label>
                  <SearchableSelect
                    v-model="profileForm.municipality"
                    :options="veMunicipios.map(m => m.name)"
                    :disabled="!profileForm.state"
                    placeholder="Selecciona un municipio"
                    @update:model-value="onProfileMunicipalityChange"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
                  <SearchableSelect
                    v-model="profileForm.city"
                    :options="veCiudades.map(c => c.name)"
                    :disabled="!profileForm.municipality"
                    placeholder="Selecciona una ciudad"
                    @update:model-value="onProfileCityChange"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Parroquia <span class="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <SearchableSelect
                    v-model="profileForm.parish"
                    :options="veParroquias.map(p => p.name)"
                    :disabled="!profileForm.city"
                    placeholder="Selecciona una parroquia"
                  />
                  <p v-if="selectedParishPostalCode" class="text-xs text-gray-400 mt-1">
                    Código postal: {{ selectedParishPostalCode }}
                  </p>
                </div>
              </template>

              <!-- Otro país: texto libre como antes -->
              <template v-else>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Estado / Provincia</label>
                  <input
                    v-model="profileForm.state"
                    type="text"
                    maxlength="100"
                    placeholder="Ej: Miranda"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
                  >
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
                  <input
                    v-model="profileForm.city"
                    type="text"
                    maxlength="100"
                    placeholder="Ej: Caracas"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300"
                  >
                </div>
              </template>
            </div>

            <!-- Categoría y Subcategoría — solo COMMERCE y FREELANCER -->
            <div v-if="isCommerceOrFreelancer" class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Categoría
                  <span class="ml-1 text-xs font-normal text-gray-400">(afecta los módulos disponibles)</span>
                </label>
                <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
                  {{ getCategoryName() || 'Sin categoría' }}
                </div>
              </div>

              <div v-if="getSubcategoryName()">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Subcategoría
                </label>
                <div class="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-700">
                  {{ getSubcategoryName() }}
                </div>
              </div>
            </div>

            <!-- Username — solo COMMERCE y FREELANCER -->
            <div v-if="isCommerce || auth.user.value?.role === 'FREELANCER'">
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Nombre de usuario
                <span class="ml-1 text-xs font-normal text-gray-400">(visible públicamente)</span>
              </label>

              <!-- Locked: cooldown active -->
              <div v-if="usernameIsLocked" class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">@</span>
                <input
                  :value="profileForm.username"
                  type="text"
                  disabled
                  class="w-full pl-8 pr-10 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                >
                <span class="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </span>
              </div>
              <p v-if="usernameIsLocked" class="mt-1.5 text-xs text-amber-600">
                Podrás cambiar tu nombre de usuario en {{ usernameDaysLeft }} día{{ usernameDaysLeft !== 1 ? 's' : '' }} (cada 30 días)
              </p>

              <!-- Unlocked: editable -->
              <div v-else class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">@</span>
                <input
                  v-model="profileForm.username"
                  type="text"
                  maxlength="30"
                  class="w-full pl-8 pr-10 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300"
                  :class="{
                    'border-gray-200 focus:ring-workplace-red/20 focus:border-workplace-red': usernameStatus === 'idle' || usernameStatus === 'checking',
                    'border-green-400 focus:ring-green-100 focus:border-green-500': usernameStatus === 'available',
                    'border-red-400 focus:ring-red-100 focus:border-red-500': usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown',
                  }"
                  placeholder="mi.usuario"
                  autocomplete="username"
                  @input="onUsernameInput(($event.target as HTMLInputElement).value)"
                >
                <!-- Status icon -->
                <span class="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg v-if="usernameStatus === 'checking'" class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <svg v-else-if="usernameStatus === 'available'" class="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else-if="usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown'" class="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </div>
              <!-- Hint / error message (only when unlocked) -->
              <p v-if="!usernameIsLocked" class="mt-1.5 text-xs" :class="{
                'text-gray-400': usernameStatus === 'idle' || usernameStatus === 'checking',
                'text-green-600': usernameStatus === 'available',
                'text-red-500': usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown',
              }">
                <span v-if="usernameStatus === 'idle'">Solo letras minúsculas, números, puntos, guiones y guiones bajos</span>
                <span v-else-if="usernameStatus === 'checking'">Verificando disponibilidad...</span>
                <span v-else-if="usernameStatus === 'available'">¡Disponible!</span>
                <span v-else-if="usernameStatus === 'taken'">Este nombre de usuario ya está en uso</span>
                <span v-else-if="usernameStatus === 'invalid'">Solo se permiten letras minúsculas, números, puntos, guiones y guiones bajos</span>
                <span v-else-if="usernameStatus === 'cooldown'">Solo puedes cambiar el nombre de usuario cada 30 días. Faltan {{ usernameCooldownDaysLeft }} día{{ usernameCooldownDaysLeft !== 1 ? 's' : '' }}</span>
              </p>
            </div>

            <!-- Save Profile Button -->
            <div class="pt-4 border-t border-gray-100">
              <div class="flex items-center justify-between">
                <p v-if="profileDirty" class="text-sm text-gray-500">
                  <span class="inline-flex items-center gap-1.5">
                    <svg class="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    Tienes cambios sin guardar
                  </span>
                </p>
                <p v-else class="text-sm text-gray-400">Sin cambios pendientes</p>
                <button
                  type="button"
                  @click="saveProfile"
                  :disabled="!profileDirty || savingProfile || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'cooldown'"
                  class="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span v-if="savingProfile" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ savingProfile ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- Change Password -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg mr-3">
              <LockClosedIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Cambiar Contraseña</h3>
          </div>

          <form @submit.prevent="changePassword" class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Contraseña Actual</label>
              <div class="relative">
                <input
                  v-model="passwordForm.current"
                  :type="showPasswords.current ? 'text' : 'password'"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300 pr-12"
                  placeholder="••••••••"
                  autocomplete="current-password"
                >
                <button type="button" @click="showPasswords.current = !showPasswords.current" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <EyeIcon v-if="!showPasswords.current" class="h-5 w-5" />
                  <EyeSlashIcon v-else class="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Nueva Contraseña</label>
              <div class="relative">
                <input
                  v-model="passwordForm.new"
                  :type="showPasswords.new ? 'text' : 'password'"
                  required
                  minlength="8"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300 pr-12"
                  placeholder="••••••••"
                  autocomplete="new-password"
                >
                <button type="button" @click="showPasswords.new = !showPasswords.new" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <EyeIcon v-if="!showPasswords.new" class="h-5 w-5" />
                  <EyeSlashIcon v-else class="h-5 w-5" />
                </button>
              </div>
              <!-- Password strength indicator -->
              <div v-if="passwordForm.new" class="mt-2 space-y-1">
                <div class="flex gap-1">
                  <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full transition-colors duration-300"
                    :class="passwordStrength >= i ? passwordStrengthColor : 'bg-gray-200'" />
                </div>
                <p class="text-xs" :class="passwordStrengthTextColor">{{ passwordStrengthLabel }}</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Confirmar Nueva Contraseña</label>
              <div class="relative">
                <input
                  v-model="passwordForm.confirm"
                  :type="showPasswords.confirm ? 'text' : 'password'"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red transition-all duration-300 pr-12"
                  :class="{ 'border-red-400 focus:border-red-500': passwordForm.confirm && passwordForm.new !== passwordForm.confirm }"
                  placeholder="••••••••"
                  autocomplete="new-password"
                >
                <button type="button" @click="showPasswords.confirm = !showPasswords.confirm" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <EyeIcon v-if="!showPasswords.confirm" class="h-5 w-5" />
                  <EyeSlashIcon v-else class="h-5 w-5" />
                </button>
              </div>
              <p v-if="passwordForm.confirm && passwordForm.new !== passwordForm.confirm" class="mt-1 text-xs text-red-500">
                Las contraseñas no coinciden
              </p>
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                :disabled="savingPassword || !passwordFormValid"
                class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span v-if="savingPassword" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {{ savingPassword ? 'Cambiando...' : 'Cambiar Contraseña' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Convertirme en freelancer — solo NORMAL -->
        <div v-if="auth.user.value?.role === 'NORMAL'" class="card-premium p-6">
          <div class="flex items-center mb-4">
            <div class="p-3 bg-gradient-to-br from-workplace-red to-red-700 rounded-xl shadow-lg mr-3">
              <BriefcaseIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Ofrece tus servicios</h3>
          </div>

          <!-- Ya tiene una solicitud -->
          <div v-if="latestFreelancerApplication" class="rounded-xl p-4 border"
            :class="{
              'bg-amber-50 border-amber-100': latestFreelancerApplication.status === 'PENDING',
              'bg-red-50 border-red-100': latestFreelancerApplication.status === 'REJECTED',
            }"
          >
            <p v-if="latestFreelancerApplication.status === 'PENDING'" class="text-sm text-amber-800 font-medium">
              Tu solicitud para convertirte en freelancer está en revisión.
            </p>
            <template v-else-if="latestFreelancerApplication.status === 'REJECTED'">
              <p class="text-sm text-red-800 font-medium">Tu solicitud fue rechazada.</p>
              <p v-if="latestFreelancerApplication.rejectionReason" class="text-xs text-red-700 mt-1">
                Motivo: {{ latestFreelancerApplication.rejectionReason }}
              </p>
              <button
                type="button"
                class="mt-3 text-xs font-semibold text-red-700 hover:text-red-800 underline"
                @click="latestFreelancerApplication = null"
              >
                Enviar una nueva solicitud
              </button>
            </template>
          </div>

          <!-- Formulario -->
          <form v-else @submit.prevent="submitFreelancerApplication" class="space-y-4">
            <p class="text-sm text-gray-500">
              Si quieres publicar servicios y recibir solicitudes de clientes, envía tu solicitud.
              Un administrador la revisará antes de activar tu cuenta de freelancer.
            </p>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Categoría de servicio</label>
              <select
                v-model="freelancerAppForm.categoryId"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
                required
                @change="onFreelancerCategoryChange"
              >
                <option value="" disabled>Selecciona una categoría</option>
                <option v-for="cat in freelancerCategories" :key="cat.id" :value="cat.id">{{ cat.icon || '🏢' }} {{ cat.name }}</option>
              </select>
            </div>

            <div v-if="freelancerSubcategories.length > 0">
              <label class="block text-sm font-semibold text-gray-700 mb-2">Subcategoría <span class="font-normal text-gray-400">(opcional)</span></label>
              <select
                v-model="freelancerAppForm.subcategoryId"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red bg-white"
              >
                <option value="">Sin subcategoría</option>
                <option v-for="sub in freelancerSubcategories" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Cuéntanos de tu experiencia <span class="font-normal text-gray-400">(opcional)</span></label>
              <textarea
                v-model="freelancerAppForm.message"
                rows="3"
                maxlength="1000"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-workplace-red/20 focus:border-workplace-red resize-none"
                placeholder="Ej: Soy electricista con 5 años de experiencia..."
              />
            </div>

            <p v-if="freelancerAppError" class="text-sm text-red-600">{{ freelancerAppError }}</p>

            <button
              type="submit"
              :disabled="!freelancerAppForm.categoryId || submittingFreelancerApp"
              class="w-full py-3 bg-workplace-red hover:bg-red-700 disabled:opacity-60 text-white rounded-xl font-bold transition-colors"
            >
              {{ submittingFreelancerApp ? 'Enviando...' : 'Enviar solicitud' }}
            </button>
          </form>
        </div>

        <!-- Active Sessions -->
        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg mr-3">
              <ComputerDesktopIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Sesiones Activas</h3>
          </div>

          <div v-if="loadingSessions" class="space-y-3">
            <div v-for="i in 2" :key="i" class="h-16 bg-gray-100 rounded-xl animate-pulse" />
          </div>

          <p v-else-if="sessions.length === 0" class="text-sm text-gray-500">
            No hay sesiones activas registradas.
          </p>

          <div v-else class="space-y-3">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between gap-4 p-4 border-2 rounded-xl"
              :class="session.isCurrent ? 'border-green-200 bg-green-50' : 'border-gray-100'"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="p-2 bg-white rounded-lg border border-gray-200 shrink-0">
                  <ComputerDesktopIcon class="h-5 w-5 text-gray-500" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">
                    {{ deviceLabel(session.deviceInfo) }}
                    <span v-if="session.isCurrent" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Sesión actual
                    </span>
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    {{ session.ipAddress || 'IP desconocida' }} · Conectado {{ formatSessionDate(session.createdAt) }}
                  </p>
                </div>
              </div>
              <button
                v-if="!session.isCurrent"
                type="button"
                @click="revokeSession(session)"
                :disabled="revokingSessionId === session.id"
                class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                title="Cerrar sesión"
              >
                <span v-if="revokingSessionId === session.id" class="block h-4 w-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                <XMarkIcon v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Accesos Rápidos -->
        <div id="quick-access" class="card-premium p-6">
          <div class="flex items-center mb-2">
            <div class="p-3 bg-gradient-to-br from-workplace-red to-red-700 rounded-xl shadow-lg mr-3">
              <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900">Accesos Rápidos</h3>
              <p class="text-sm text-gray-500">Elige hasta {{ MAX_QUICK_ACCESS }} accesos para tu sidebar</p>
            </div>
          </div>

          <div v-if="quickAccessAvailable.length === 0" class="text-sm text-gray-500 py-4">
            No tienes accesos disponibles para configurar.
          </div>

          <div v-else class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              v-for="item in quickAccessAvailable"
              :key="item.id"
              type="button"
              @click="toggleQuickAccess(item.id)"
              :disabled="!quickAccessSelection.includes(item.id) && quickAccessSelection.length >= MAX_QUICK_ACCESS"
              class="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-white overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              :class="[item.gradient, quickAccessSelection.includes(item.id) ? 'ring-2 ring-offset-2 ring-workplace-red scale-[1.02]' : 'hover:scale-[1.02]']"
            >
              <svg v-if="quickAccessSelection.includes(item.id)" class="absolute top-1.5 right-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
              </svg>
              <span class="text-xs font-semibold leading-none">{{ item.label }}</span>
            </button>
          </div>

          <div class="mt-5 flex items-center gap-3">
            <button
              type="button"
              @click="saveQuickAccess"
              :disabled="savingQuickAccess"
              class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span v-if="savingQuickAccess" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {{ savingQuickAccess ? 'Guardando...' : 'Guardar Accesos' }}
            </button>
            <transition name="fade">
              <span v-if="quickAccessMsg" class="text-sm font-medium text-green-700">{{ quickAccessMsg }}</span>
            </transition>
          </div>
        </div>

        <!-- Acciones Rápidas (dashboard) -->
        <div id="quick-actions" class="card-premium p-6">
          <div class="flex items-center mb-2">
            <div class="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg mr-3">
              <CogIcon class="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900">Acciones Rápidas</h3>
              <p class="text-sm text-gray-500">Elige hasta {{ MAX_DASHBOARD_QUICK_ACTIONS }} acciones para tu dashboard</p>
            </div>
          </div>

          <div v-if="dashboardActionsAvailable.length === 0" class="text-sm text-gray-500 py-4">
            No tienes acciones disponibles para configurar.
          </div>

          <div v-else class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              v-for="action in dashboardActionsAvailable"
              :key="action.id"
              type="button"
              @click="toggleDashboardAction(action.id)"
              :disabled="!dashboardActionsSelection.includes(action.id) && dashboardActionsSelection.length >= MAX_DASHBOARD_QUICK_ACTIONS"
              class="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl text-white overflow-hidden transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              :class="[dashboardGradientClasses[action.color], dashboardActionsSelection.includes(action.id) ? 'ring-2 ring-offset-2 ring-purple-600 scale-[1.02]' : 'hover:scale-[1.02]']"
            >
              <svg v-if="dashboardActionsSelection.includes(action.id)" class="absolute top-1.5 right-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/>
              </svg>
              <span class="text-xs font-semibold leading-none">{{ action.name }}</span>
            </button>
          </div>

          <div class="mt-5 flex items-center gap-3">
            <button
              type="button"
              @click="saveDashboardActions"
              :disabled="savingDashboardActions"
              class="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span v-if="savingDashboardActions" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {{ savingDashboardActions ? 'Guardando...' : 'Guardar Acciones' }}
            </button>
            <transition name="fade">
              <span v-if="dashboardActionsMsg" class="text-sm font-medium text-green-700">{{ dashboardActionsMsg }}</span>
            </transition>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  UserCircleIcon,
  LockClosedIcon,
  CheckCircleIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ShieldExclamationIcon,
  EyeIcon,
  EyeSlashIcon,
  CameraIcon,
  ComputerDesktopIcon,
  XMarkIcon,
  Cog6ToothIcon,
  CogIcon,
  BriefcaseIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import SearchableSelect from '~/components/ui/SearchableSelect.vue'
import { useConfirm } from '~/composables/ui/useConfirm'
import { useAuth, type Session } from '~/composables/auth/useAuth'
import { useCamera } from '~/composables/core/useCamera'
import { useQuickAccess, MAX_QUICK_ACCESS } from '~/composables/dashboard/useQuickAccess'
import { useDashboardQuickActions, MAX_DASHBOARD_QUICK_ACTIONS } from '~/composables/dashboard/useDashboardQuickActions'
import { useKyc } from '~/composables/kyc/useKyc'
import { useFreelancerApplication, type FreelancerApplication } from '~/composables/jobs/useFreelancerApplication'
import { useVeLocations, type VeMunicipio, type VeCiudad } from '~/composables/location/useVeLocations'
import { useLocationData } from '~/composables/location/useLocationData'
import { useDateFormat } from '~/composables/core/useDateFormat'

const auth = useAuth()
const { checkUsername } = auth
const { confirm } = useConfirm()
const { takePhoto } = useCamera()
const { formatDateTime } = useDateFormat()
const { can } = usePermissions()

// ─── Estado de verificación de identidad (KYC) ────────────────────────────────
const { myStatus: kycMyStatus, fetchMyStatus: fetchKycStatus } = useKyc()
onMounted(() => { fetchKycStatus() })

const kycBadge = computed(() => {
  const status = kycMyStatus.value?.kycStatus ?? 'NONE'
  return ({
    NONE: { label: 'Identidad sin verificar', icon: ShieldExclamationIcon, class: 'bg-gray-100 text-gray-500 hover:bg-gray-200' },
    PENDING: { label: 'Verificación en revisión', icon: ClockIcon, class: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
    APPROVED: { label: 'Identidad verificada', icon: CheckBadgeIcon, class: 'bg-green-100 text-green-700 hover:bg-green-200' },
    REJECTED: { label: 'Verificación rechazada', icon: ExclamationCircleIcon, class: 'bg-red-100 text-red-600 hover:bg-red-200' },
  })[status]
})
const canSeeSettings = computed(() => can('settings:view'))

// ─── Convertirme en freelancer (solo NORMAL) ─────────────────────────────────
const { mine: freelancerApplications, fetchMine: fetchFreelancerApplications, create: createFreelancerApplication } = useFreelancerApplication()
const { get: apiGet } = useApi()

const freelancerCategories = ref<{ id: string; name: string; icon?: string }[]>([])
const freelancerSubcategories = ref<{ id: string; name: string }[]>([])
const freelancerAppForm = ref({ categoryId: '', subcategoryId: '', message: '' })
const submittingFreelancerApp = ref(false)
const freelancerAppError = ref('')
const latestFreelancerApplication = ref<FreelancerApplication | null>(null)

async function loadFreelancerCategories() {
  try {
    freelancerCategories.value = await apiGet('/users/categories')
  } catch { /* no bloquea el resto del perfil */ }
}

async function onFreelancerCategoryChange() {
  freelancerAppForm.value.subcategoryId = ''
  freelancerSubcategories.value = []
  if (!freelancerAppForm.value.categoryId) return
  try {
    freelancerSubcategories.value = await apiGet(`/users/categories/${freelancerAppForm.value.categoryId}/subcategories`)
  } catch { /* sin subcategorías es un caso válido */ }
}

async function submitFreelancerApplication() {
  freelancerAppError.value = ''
  submittingFreelancerApp.value = true
  try {
    const created = await createFreelancerApplication({
      categoryId: freelancerAppForm.value.categoryId,
      subcategoryId: freelancerAppForm.value.subcategoryId || undefined,
      message: freelancerAppForm.value.message || undefined,
    })
    latestFreelancerApplication.value = created
  } catch (e: any) {
    freelancerAppError.value = e?.data?.message ?? e?.message ?? 'Error al enviar la solicitud'
  } finally {
    submittingFreelancerApp.value = false
  }
}

if (auth.user.value?.role === 'NORMAL') {
  loadFreelancerCategories()
  fetchFreelancerApplications().then(() => {
    latestFreelancerApplication.value = freelancerApplications.value[0] ?? null
  })
}

// ─── Accesos rápidos ────────────────────────────────────────────────────────
const { availableItems: quickAccessAvailable, savedIds: quickAccessSavedIds, setQuickAccessIds, saving: savingQuickAccess } = useQuickAccess()
const quickAccessSelection = ref<string[]>([])
const quickAccessMsg = ref('')

watch(quickAccessSavedIds, (ids) => {
  quickAccessSelection.value = ids.length > 0
    ? [...ids]
    : quickAccessAvailable.value.slice(0, MAX_QUICK_ACCESS).map(i => i.id)
}, { immediate: true })

function toggleQuickAccess(id: string) {
  const idx = quickAccessSelection.value.indexOf(id)
  if (idx !== -1) {
    quickAccessSelection.value.splice(idx, 1)
  } else {
    if (quickAccessSelection.value.length >= MAX_QUICK_ACCESS) return
    quickAccessSelection.value.push(id)
  }
}

async function saveQuickAccess() {
  quickAccessMsg.value = ''
  try {
    await setQuickAccessIds(quickAccessSelection.value)
    quickAccessMsg.value = 'Accesos rápidos actualizados'
    setTimeout(() => { quickAccessMsg.value = '' }, 2500)
  } catch {
    quickAccessMsg.value = 'No se pudo guardar'
  }
}

// ─── Acciones rápidas (dashboard) ──────────────────────────────────────────────
const dashboardGradientClasses: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  green: 'bg-gradient-to-br from-green-500 to-green-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  yellow: 'bg-gradient-to-br from-yellow-500 to-orange-500',
  red: 'bg-gradient-to-br from-red-500 to-red-600',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-600',
  indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
}
const {
  availableItems: dashboardActionsAvailable,
  savedIds: dashboardActionsSavedIds,
  setDashboardQuickActionIds,
  saving: savingDashboardActions,
} = useDashboardQuickActions()
const dashboardActionsSelection = ref<string[]>([])
const dashboardActionsMsg = ref('')

watch(dashboardActionsSavedIds, (ids) => {
  dashboardActionsSelection.value = ids.length > 0
    ? [...ids]
    : dashboardActionsAvailable.value.slice(0, MAX_DASHBOARD_QUICK_ACTIONS).map(a => a.id)
}, { immediate: true })

function toggleDashboardAction(id: string) {
  const idx = dashboardActionsSelection.value.indexOf(id)
  if (idx !== -1) {
    dashboardActionsSelection.value.splice(idx, 1)
  } else {
    if (dashboardActionsSelection.value.length >= MAX_DASHBOARD_QUICK_ACTIONS) return
    dashboardActionsSelection.value.push(id)
  }
}

async function saveDashboardActions() {
  dashboardActionsMsg.value = ''
  try {
    await setDashboardQuickActionIds(dashboardActionsSelection.value)
    dashboardActionsMsg.value = 'Acciones rápidas actualizadas'
    setTimeout(() => { dashboardActionsMsg.value = '' }, 2500)
  } catch {
    dashboardActionsMsg.value = 'No se pudo guardar'
  }
}

// ─── State ────────────────────────────────────────────────────────────────────
const loadingProfile = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const uploadingAvatar = ref(false)
const avatarPreview = ref<string | null>(null)
const successMsg = ref('')
const errorMsg = ref('')
let successTimer: ReturnType<typeof setTimeout> | null = null

const profileForm = ref({ firstName: '', lastName: '', email: '', phone: '', username: '', categoryId: '', country: '', state: '', city: '', municipality: '', parish: '' })
const passwordForm = ref({ current: '', new: '', confirm: '' })

// ─── Ubicación: catálogo VE en cascada Estado→Municipio→Ciudad→Parroquia ─────
const { getCountries } = useLocationData()
const { getStates: getVeStates, getMunicipios: getVeMunicipios, getCiudades: getVeCiudades, getParroquias: getVeParroquias } = useVeLocations()

const countryNames = ref<string[]>([])
const isVenezuelaProfile = computed(() => profileForm.value.country.trim().toLowerCase() === 'venezuela')

const veStates = ref<string[]>([])
const veMunicipios = ref<VeMunicipio[]>([])
const veCiudades = ref<VeCiudad[]>([])
const veParroquias = ref<{ id: string; name: string; postalCode: string | null }[]>([])

const selectedParishPostalCode = computed(() => {
  const p = veParroquias.value.find((p) => p.name === profileForm.value.parish)
  return p?.postalCode ?? null
})

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

function onProfileCountryChange() {
  if (!isVenezuelaProfile.value) return
  profileForm.value.state = ''
  profileForm.value.municipality = ''
  profileForm.value.city = ''
  profileForm.value.parish = ''
}

function onProfileStateChange() {
  profileForm.value.municipality = ''
  profileForm.value.city = ''
  profileForm.value.parish = ''
}

function onProfileMunicipalityChange() {
  profileForm.value.city = ''
  profileForm.value.parish = ''
}

function onProfileCityChange() {
  profileForm.value.parish = ''
}

watch(isVenezuelaProfile, (isVe) => {
  if (isVe && veStates.value.length === 0) {
    getVeStates().then((s) => { veStates.value = s })
  }
}, { immediate: true })

watch(() => profileForm.value.state, (state) => {
  if (isVenezuelaProfile.value && state) loadVeMunicipios(state)
})

watch(() => profileForm.value.municipality, (municipality) => {
  if (isVenezuelaProfile.value && municipality) loadVeCiudades(municipality)
})

watch(() => profileForm.value.city, (city) => {
  if (isVenezuelaProfile.value && city) loadVeParroquias(city)
})

const showPasswords = ref({ current: false, new: false, confirm: false })

// ─── Active sessions ──────────────────────────────────────────────────────────
const sessions = ref<Session[]>([])
const loadingSessions = ref(false)
const revokingSessionId = ref<string | null>(null)

// ─── Username availability check ──────────────────────────────────────────────
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'cooldown'
const usernameStatus = ref<UsernameStatus>('idle')
const usernameCooldownDaysLeft = ref(0)
let usernameDebounce: ReturnType<typeof setTimeout> | null = null

const USERNAME_REGEX = /^[a-z0-9_.-]+$/
const USERNAME_COOLDOWN_DAYS = 30

// Computed: is username field locked due to cooldown?
const usernameIsLocked = computed(() => {
  const u = auth.user.value
  if (!u?.usernameUpdatedAt) return false
  const daysSince = (Date.now() - new Date(u.usernameUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince < USERNAME_COOLDOWN_DAYS
})

const usernameDaysLeft = computed(() => {
  const u = auth.user.value
  if (!u?.usernameUpdatedAt) return 0
  const daysSince = (Date.now() - new Date(u.usernameUpdatedAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince)
})

function onUsernameInput(val: string) {
  usernameStatus.value = 'idle'
  if (usernameDebounce) clearTimeout(usernameDebounce)
  if (!val || val.length < 3) return
  if (!USERNAME_REGEX.test(val)) {
    usernameStatus.value = 'invalid'
    return
  }
  // If same as current username, no check needed
  if (val === (auth.user.value?.username ?? '')) {
    usernameStatus.value = 'idle'
    return
  }
  usernameStatus.value = 'checking'
  usernameDebounce = setTimeout(async () => {
    try {
      const res = await checkUsername(val)
      if (!res.canChange) {
        usernameStatus.value = 'cooldown'
        usernameCooldownDaysLeft.value = res.daysLeft
      } else {
        usernameStatus.value = res.available ? 'available' : 'taken'
      }
    } catch {
      usernameStatus.value = 'idle'
    }
  }, 500)
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const fullName = computed(() => {
  const u = auth.user.value
  if (!u) return ''
  return `${u.firstName} ${u.lastName}`.trim()
})

const userInitials = computed(() => {
  const u = auth.user.value
  if (!u) return '?'
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase()
})

const ROLE_STYLES: Record<string, { label: string; badge: string }> = {
  SUPERADMIN: { label: 'Super Administrador', badge: 'bg-red-100 text-red-800' },
  ADMIN: { label: 'Administrador', badge: 'bg-purple-100 text-purple-800' },
  COMMERCE: { label: 'Comercio', badge: 'bg-blue-100 text-blue-800' },
  FREELANCER: { label: 'Freelancer', badge: 'bg-amber-100 text-amber-800' },
  NORMAL: { label: 'Usuario', badge: 'bg-gray-100 text-gray-700' },
}

const roleStyle = computed(() => ROLE_STYLES[auth.user.value?.role ?? 'NORMAL'] ?? ROLE_STYLES.NORMAL)
// Solo COMMERCE tiene comercio asociado y perfil público
const isCommerce = computed(() => auth.user.value?.role === 'COMMERCE')
const isCommerceOrFreelancer = computed(() => ['COMMERCE', 'FREELANCER'].includes(auth.user.value?.role ?? ''))

// Categories and Subcategories
const categories = ref<{ id: string; name: string; icon: string }[]>([])
const subcategories = ref<{ id: string; name: string; categoryId: string }[]>([])
const loadingCategories = ref(false)

async function fetchCategories() {
  if (!isCommerceOrFreelancer.value) return
  loadingCategories.value = true
  try {
    const { get } = useApi()
    categories.value = await get<typeof categories.value>('/users/categories')
  } catch { /* ignore */ } finally {
    loadingCategories.value = false
  }
}

async function fetchSubcategories() {
  if (!isCommerceOrFreelancer.value) return
  try {
    const { get } = useApi()
    subcategories.value = await get<typeof subcategories.value>('/users/subcategories')
  } catch { /* ignore */ }
}

function getCategoryName() {
  const u = auth.user.value as any
  if (!u?.categoryId) return ''
  const category = categories.value.find(cat => cat.id === u.categoryId)
  return category ? `${category.icon} ${category.name}` : ''
}

function getSubcategoryName() {
  const u = auth.user.value as any
  if (!u?.subcategoryId) return ''
  const subcategory = subcategories.value.find(sub => sub.id === u.subcategoryId)
  return subcategory ? subcategory.name : ''
}

const { getAssetUrl } = useAssetUrl()
const avatarUrl = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  return getAssetUrl(auth.user.value?.avatar)
})

// Track dirty state to enable/disable Save button
const profileDirty = computed(() => {
  const u = auth.user.value
  if (!u) return false
  return (
    profileForm.value.firstName !== (u.firstName ?? '') ||
    profileForm.value.lastName !== (u.lastName ?? '') ||
    profileForm.value.email !== (u.email ?? '') ||
    profileForm.value.phone !== (u.phone ?? '') ||
    profileForm.value.username !== (u.username ?? '') ||
    profileForm.value.categoryId !== ((u as any).categoryId ?? '') ||
    profileForm.value.country !== (u.country ?? '') ||
    profileForm.value.state !== (u.state ?? '') ||
    profileForm.value.city !== (u.city ?? '') ||
    profileForm.value.municipality !== (u.municipality ?? '') ||
    profileForm.value.parish !== (u.parish ?? '')
  )
})

const passwordFormValid = computed(() =>
  passwordForm.value.current.length > 0 &&
  passwordForm.value.new.length >= 8 &&
  passwordForm.value.new === passwordForm.value.confirm
)

// Password strength
const passwordStrength = computed(() => {
  const p = passwordForm.value.new
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const passwordStrengthColor = computed(() => {
  const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
  return colors[passwordStrength.value] ?? 'bg-gray-200'
})

const passwordStrengthTextColor = computed(() => {
  const colors = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600']
  return colors[passwordStrength.value] ?? 'text-gray-400'
})

const passwordStrengthLabel = computed(() => {
  const labels = ['', 'Muy débil', 'Débil', 'Buena', 'Fuerte']
  return labels[passwordStrength.value] ?? ''
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function syncFormFromUser() {
  const u = auth.user.value
  if (!u) return
  profileForm.value = {
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    username: u.username ?? '',
    categoryId: (u as any).categoryId ?? '',
    country: u.country ?? '',
    state: u.state ?? '',
    city: u.city ?? '',
    municipality: u.municipality ?? '',
    parish: u.parish ?? '',
  }
  usernameStatus.value = 'idle'
}

function resetProfileForm() {
  syncFormFromUser()
}

function showSuccess(msg: string) {
  errorMsg.value = ''
  successMsg.value = msg
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => { successMsg.value = '' }, 4000)
}

function showError(err: unknown) {
  successMsg.value = ''
  const e = err as { data?: { message?: unknown }; message?: string }
  const detail = e?.data?.message ?? e?.message ?? 'Ocurrió un error inesperado'
  errorMsg.value = Array.isArray(detail) ? detail.join('. ') : String(detail)
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => { errorMsg.value = '' }, 6000)
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function triggerAvatarInput() {
  const file = await takePhoto()
  if (!file) return

  // Preview local
  const reader = new FileReader()
  reader.onload = (e) => { avatarPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)

  uploadingAvatar.value = true
  errorMsg.value = ''
  try {
    await auth.uploadAvatar(file)
    avatarPreview.value = null // usar la URL del servidor ya persistida
    showSuccess('Foto de perfil actualizada')
  } catch (err) {
    avatarPreview.value = null
    showError(err)
  } finally {
    uploadingAvatar.value = false
  }
}

async function saveProfile() {
  if (!profileDirty.value) return
  if (usernameStatus.value === 'taken') return
  if (usernameStatus.value === 'invalid') return
  if (usernameStatus.value === 'cooldown') return

  const usernameChanging = profileForm.value.username !== (auth.user.value?.username ?? '')

  if (usernameChanging && profileForm.value.username) {
    const ok = await confirm({
      title: '¿Confirmas el cambio?',
      message: `Estás a punto de establecer @${profileForm.value.username} como tu nombre de usuario. Podrás volver a cambiarlo en 30 días.`,
      confirmText: 'Sí, cambiar',
      variant: 'danger',
    })
    if (!ok) return
  }

  savingProfile.value = true
  errorMsg.value = ''
  try {
    await auth.saveProfile({
      firstName: profileForm.value.firstName,
      lastName: profileForm.value.lastName,
      email: profileForm.value.email,
      phone: profileForm.value.phone || undefined,
      username: profileForm.value.username || undefined,
      categoryId: profileForm.value.categoryId || undefined,
      country: profileForm.value.country || undefined,
      state: profileForm.value.state || undefined,
      city: profileForm.value.city || undefined,
      municipality: profileForm.value.municipality || undefined,
      parish: profileForm.value.parish || undefined,
    } as any)
    usernameStatus.value = 'idle'
    showSuccess('Perfil actualizado correctamente')
  } catch (err) {
    showError(err)
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  if (!passwordFormValid.value) return
  savingPassword.value = true
  errorMsg.value = ''
  try {
    await auth.changePassword({
      currentPassword: passwordForm.value.current,
      newPassword: passwordForm.value.new,
    })
    passwordForm.value = { current: '', new: '', confirm: '' }
    showSuccess('Contraseña cambiada correctamente')
  } catch (err) {
    showError(err)
  } finally {
    savingPassword.value = false
  }
}

// ─── Active sessions ──────────────────────────────────────────────────────────
async function fetchSessions() {
  loadingSessions.value = true
  try {
    sessions.value = await auth.getSessions()
  } catch (err) {
    showError(err)
  } finally {
    loadingSessions.value = false
  }
}

function deviceLabel(userAgent?: string | null): string {
  if (!userAgent) return 'Dispositivo desconocido'
  const ua = userAgent.toLowerCase()
  let os = 'Desconocido'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac os') || ua.includes('macintosh')) os = 'macOS'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
  else if (ua.includes('linux')) os = 'Linux'

  let browser = 'Navegador'
  if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome/')) browser = 'Chrome'
  else if (ua.includes('firefox/')) browser = 'Firefox'
  else if (ua.includes('safari/')) browser = 'Safari'

  return `${browser} en ${os}`
}

function formatSessionDate(value: string): string {
  return formatDateTime(value)
}

async function revokeSession(session: Session) {
  const ok = await confirm({
    title: '¿Cerrar esta sesión?',
    message: 'El dispositivo deberá iniciar sesión nuevamente.',
    confirmText: 'Sí, cerrar sesión',
    variant: 'danger',
  })
  if (!ok) return

  revokingSessionId.value = session.id
  try {
    await auth.revokeSession(session.id)
    sessions.value = sessions.value.filter((s) => s.id !== session.id)
    showSuccess('Sesión cerrada correctamente')
  } catch (err) {
    showError(err)
  } finally {
    revokingSessionId.value = null
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  getCountries().then((countries) => { countryNames.value = countries.map((c) => c.name) })
  if (!auth.user.value) {
    loadingProfile.value = true
    await auth.fetchProfile()
    loadingProfile.value = false
  }
  syncFormFromUser()
  await Promise.all([fetchCategories(), fetchSubcategories(), fetchSessions()])

  const targetTab = useRoute().query.tab
  if (targetTab === 'quick-access' || targetTab === 'quick-actions') {
    nextTick(() => {
      document.getElementById(targetTab as string)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
})

// Sync form if user changes after fetch
watch(() => auth.user.value, syncFormFromUser)

onUnmounted(() => {
  if (usernameDebounce) clearTimeout(usernameDebounce)
  if (successTimer) clearTimeout(successTimer)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
