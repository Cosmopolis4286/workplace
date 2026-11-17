<template>
  <section class="space-y-4" aria-labelledby="profile-permissions-title">
    <div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <UserGroupIcon class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <h2 id="profile-permissions-title" class="text-sm font-semibold text-gray-900">Perfiles de negocio</h2>
          <p class="mt-0.5 max-w-3xl text-xs leading-5 text-gray-500">Permisos adicionales por perfil activo. Si un usuario tiene varios perfiles, sus capacidades se combinan con los permisos de su rol RBAC.</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600">{{ permissions.length }} permisos</span>
        <span v-if="pendingCount" class="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">{{ pendingCount }} cambios pendientes</span>
        <slot name="actions" />
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <span v-for="profile in profiles" :key="profile.key" class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700">
        <span class="h-2 w-2 rounded-full" :class="profile.dotClass" />
        {{ profile.label }}
      </span>
    </div>
    <PermissionMatrixTable
      :loading="loading"
      :permissions="permissions"
      :grouped-permissions="groupedPermissions"
      :roles="profileKeys"
      :role-labels="profileLabels"
      :role-badge-classes="profileBadgeClasses"
      :module-labels="moduleLabels"
      :plans-for-module="{}"
      :local-matrix="localMatrix"
      @toggle="(id, profile, granted) => $emit('toggle', id, profile, granted)"
    />
  </section>
</template>

<script setup lang="ts">
import { UserGroupIcon } from '@heroicons/vue/24/outline'
import PermissionMatrixTable from './PermissionMatrixTable.vue'

type PermissionRow = {
  id: string; key: string; module: string; action: string; label: string
  description?: string; isSystem: boolean
}

defineProps<{
  loading: boolean
  permissions: PermissionRow[]
  groupedPermissions: Record<string, PermissionRow[]>
  profileKeys: string[]
  profileLabels: Record<string, string>
  profileBadgeClasses: Record<string, string>
  moduleLabels: Record<string, string>
  localMatrix: Record<string, Record<string, boolean>>
  pendingCount: number
}>()

defineEmits<{
  toggle: [permissionId: string, profile: string, granted: boolean]
}>()

const profiles = [
  { key: 'BUSINESS', label: 'Negocio', dotClass: 'bg-emerald-500' },
  { key: 'PROFESSIONAL_FREELANCER', label: 'Profesional · Freelancer', dotClass: 'bg-amber-500' },
  { key: 'PROFESSIONAL_SERVICE_PROVIDER', label: 'Profesional · Prestador de servicio', dotClass: 'bg-orange-500' },
]
</script>
