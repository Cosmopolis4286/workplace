<template>
  <div class="space-y-6">
    <PageHeader title="Ficha del usuario" description="Identidad, perfiles, verificación y actividad administrativa" :icon="UserCircleIcon" :breadcrumb="[{ label: 'Usuarios', to: '/users' }, { label: 'Ficha' }]">
      <template #actions><NuxtLink to="/users" class="btn-secondary">Volver al directorio</NuxtLink></template>
    </PageHeader>
    <div v-if="loading" class="card p-8 text-sm text-gray-500">Cargando ficha del usuario…</div>
    <div v-else-if="error" class="card p-6 border border-red-200 text-red-700">{{ error }} <button class="ml-3 underline" @click="load">Reintentar</button></div>
    <template v-else-if="overview">
      <section class="card p-6 space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div><h2 class="text-xl font-bold text-gray-900">{{ overview.user.firstName }} {{ overview.user.lastName }}</h2><p class="text-sm text-gray-500">{{ overview.user.email }} · {{ overview.user.username ? '@' + overview.user.username : 'Sin username' }}</p><p class="text-xs text-gray-400 mt-1">ID: {{ overview.user.id }}</p></div>
          <div class="flex flex-wrap gap-2">
            <span class="badge" :class="overview.user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">{{ overview.user.isActive ? 'Cuenta activa' : 'Cuenta suspendida' }}</span>
            <span class="badge" :class="kycClass(overview.user.kycStatus)">KYC: {{ kycLabel(overview.user.kycStatus) }}</span>
            <span class="badge" :class="overview.user.emailVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">{{ overview.user.emailVerified ? 'Correo verificado' : 'Correo sin verificar' }}</span>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><p class="text-gray-400">Rol de acceso</p><p class="font-semibold">{{ overview.user.role }}</p></div>
          <div><p class="text-gray-400">2FA</p><p class="font-semibold">{{ overview.user.twoFactorEnabled ? 'Activado' : 'Desactivado' }}</p></div>
          <div><p class="text-gray-400">Teléfono</p><p class="font-semibold">{{ overview.user.phone || '—' }}</p></div>
          <div><p class="text-gray-400">Registro</p><p class="font-semibold">{{ formatDate(overview.user.createdAt) }}</p></div>
          <div><p class="text-gray-400">Ubicación</p><p class="font-semibold">{{ [overview.user.city, overview.user.state, overview.user.country].filter(Boolean).join(', ') || '—' }}</p></div>
          <div><p class="text-gray-400">Categoría</p><p class="font-semibold">{{ overview.user.category?.name || '—' }}</p></div>
          <div><p class="text-gray-400">Subcategoría</p><p class="font-semibold">{{ overview.user.subcategory?.name || '—' }}</p></div>
          <div><p class="text-gray-400">Comercio</p><p class="font-semibold">{{ overview.user.commerce?.name || '—' }}</p></div>
        </div>
      </section>
      <section class="card p-6 space-y-4">
        <div><h3 class="font-semibold text-gray-900">Perfiles funcionales</h3><p class="text-xs text-gray-500">Separados del rol RBAC de la cuenta</p></div>
        <div v-if="overview.user.profiles.length" class="divide-y divide-gray-100">
          <div v-for="profile in overview.user.profiles" :key="profile.id" class="py-3 flex flex-wrap items-center justify-between gap-2">
            <div><p class="font-medium text-sm">{{ profile.type }} <span v-if="profile.subtype" class="text-gray-500">· {{ profile.subtype }}</span></p><p class="text-xs text-gray-400">{{ profile.category?.name || 'Sin categoría' }} · {{ profile.subcategory?.name || 'Sin subcategoría' }}</p><p v-if="profile.rejectionReason" class="text-xs text-red-600 mt-1">Motivo: {{ profile.rejectionReason }}</p></div>
            <span class="badge" :class="profile.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : profile.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'">{{ profile.status }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No hay perfiles funcionales de negocio registrados.</p>
      </section>
      <section class="card p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="font-semibold text-gray-900">Verificación de identidad (KYC)</h3><p class="text-xs text-gray-500">Documentos protegidos; esta ficha solo muestra datos enmascarados.</p></div><NuxtLink to="/kyc-admin" class="text-sm text-blue-600 hover:underline">Abrir bandeja KYC</NuxtLink></div>
        <div v-if="overview.user.identityVerifications.length" class="divide-y divide-gray-100">
          <div v-for="item in overview.user.identityVerifications" :key="item.id" class="py-3 flex flex-wrap items-center justify-between gap-3">
            <div><p class="text-sm font-medium">{{ item.documentType }} · {{ item.documentNumber }}</p><p class="text-xs text-gray-400">Enviado {{ formatDate(item.createdAt) }}<span v-if="item.reviewedAt"> · Revisado {{ formatDate(item.reviewedAt) }}</span></p><p v-if="item.rejectionReason" class="text-xs text-red-600 mt-1">{{ item.rejectionReason }}</p></div>
            <span class="badge" :class="kycClass(item.status)">{{ kycLabel(item.status) }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">El usuario todavía no ha enviado documentos de identidad.</p>
      </section>
      <section class="card p-6 space-y-4">
        <div><h3 class="font-semibold text-gray-900">Actividad administrativa reciente</h3><p class="text-xs text-gray-500">Últimos 30 eventos vinculados al usuario o a su cuenta.</p></div>
        <div v-if="overview.activity.length" class="divide-y divide-gray-100">
          <div v-for="event in overview.activity" :key="event.id" class="py-3 flex flex-wrap justify-between gap-2">
            <div class="min-w-0"><p class="text-sm font-medium text-gray-800">{{ event.summary }}</p><p class="text-xs text-gray-400">{{ event.module }} · {{ event.action }} · {{ event.userRole || 'Sistema' }} {{ event.userEmail ? '· ' + event.userEmail : '' }}</p></div><time class="text-xs text-gray-400">{{ formatDate(event.createdAt) }}</time>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No hay eventos administrativos registrados para esta cuenta.</p>
      </section>
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UserCircleIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useUsers, type UserAdminOverview } from '~/composables/users/useUsers'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { getAdminOverview } = useUsers()
const overview = ref<UserAdminOverview | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
function formatDate(value: string) { return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function kycLabel(value: string) { return ({ NONE: 'Sin verificar', PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado' } as Record<string, string>)[value] || value }
function kycClass(value: string) { return value === 'APPROVED' ? 'bg-green-100 text-green-700' : value === 'PENDING' ? 'bg-amber-100 text-amber-700' : value === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600' }
async function load() {
  loading.value = true; error.value = null
  try { overview.value = await getAdminOverview(String(route.params.id)) }
  catch (cause) { error.value = getApiErrorMessage(cause, 'No se pudo cargar la ficha del usuario') }
  finally { loading.value = false }
}
onMounted(load)
</script>
