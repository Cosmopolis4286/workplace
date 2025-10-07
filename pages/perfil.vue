<template>
  <div>
    <PageHeader
      title="Mi Perfil"
      subtitle="Gestiona tu información personal y preferencias"
      :icon="UserCircleIcon"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1">
        <div class="card-premium p-6">
          <div class="text-center">
            <div class="relative inline-block mb-4">
              <img
                class="h-32 w-32 rounded-full shadow-xl ring-4 ring-white"
                src="https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop"
                alt="Avatar"
              >
              <button class="absolute bottom-0 right-0 bg-gradient-to-r from-ifood-red to-red-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300">
                <CameraIcon class="h-5 w-5" />
              </button>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-1">{{ profileData.name }}</h2>
            <p class="text-gray-500 mb-4">{{ profileData.email }}</p>
            <div class="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
              <div class="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
              Cuenta Activa
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-gray-200">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Miembro desde</span>
                <span class="text-sm font-semibold text-gray-900">{{ profileData.memberSince }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Rol</span>
                <span class="text-sm font-semibold text-gray-900">{{ profileData.role }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Total ventas</span>
                <span class="text-sm font-semibold text-ifood-red">{{ profileData.totalSales }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div class="card-premium p-6 mb-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
              <UserCircleIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Información Personal</h3>
          </div>

          <form @submit.prevent="saveProfile" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre Completo</label>
                <input
                  v-model="profileData.name"
                  type="text"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                  placeholder="Tu nombre completo"
                >
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                <input
                  v-model="profileData.email"
                  type="email"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                  placeholder="tu@email.com"
                >
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                <input
                  v-model="profileData.phone"
                  type="tel"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                  placeholder="+52 123 456 7890"
                >
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Rol</label>
                <select
                  v-model="profileData.role"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Gerente">Gerente</option>
                  <option value="Chef">Chef</option>
                  <option value="Mesero">Mesero</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
              <input
                v-model="profileData.address"
                type="text"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                placeholder="Calle, número, colonia"
              >
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Biografía</label>
              <textarea
                v-model="profileData.bio"
                rows="4"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                placeholder="Cuéntanos sobre ti..."
              ></textarea>
            </div>

            <div class="flex justify-end space-x-4">
              <button
                type="button"
                @click="cancelEdit"
                class="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-6 py-3 bg-gradient-to-r from-ifood-red to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>

        <div class="card-premium p-6">
          <div class="flex items-center mb-6">
            <div class="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg mr-3">
              <LockClosedIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Cambiar Contraseña</h3>
          </div>

          <form @submit.prevent="changePassword" class="space-y-6">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Contraseña Actual</label>
              <input
                v-model="passwordData.current"
                type="password"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                placeholder="••••••••"
              >
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Nueva Contraseña</label>
              <input
                v-model="passwordData.new"
                type="password"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                placeholder="••••••••"
              >
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Confirmar Nueva Contraseña</label>
              <input
                v-model="passwordData.confirm"
                type="password"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
                placeholder="••••••••"
              >
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                class="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Cambiar Contraseña
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UserCircleIcon, CameraIcon, LockClosedIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  layout: 'default'
})

const profileData = ref({
  name: 'Juan Pérez',
  email: 'juan@restaurant.com',
  phone: '+52 123 456 7890',
  role: 'Administrador',
  address: 'Av. Principal 123, Col. Centro',
  bio: 'Gerente de restaurante con más de 10 años de experiencia en la industria alimentaria.',
  memberSince: 'Enero 2024',
  totalSales: '$45,320'
})

const passwordData = ref({
  current: '',
  new: '',
  confirm: ''
})

const saveProfile = () => {
  console.log('Saving profile:', profileData.value)
}

const cancelEdit = () => {
  console.log('Canceling edit')
}

const changePassword = () => {
  if (passwordData.value.new !== passwordData.value.confirm) {
    alert('Las contraseñas no coinciden')
    return
  }
  console.log('Changing password')
}
</script>
