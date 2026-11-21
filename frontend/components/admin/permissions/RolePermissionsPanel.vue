<template>
  <section class="space-y-4" aria-labelledby="role-permissions-title">
    <div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <ShieldCheckIcon class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <h2 id="role-permissions-title" class="text-sm font-semibold text-gray-900">Roles de acceso (RBAC)</h2>
          <p class="mt-0.5 text-xs leading-5 text-gray-500">Define las capacidades base de cada rol. Los permisos protegidos por jerarquía o de sistema permanecen bloqueados.</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600">{{ permissions.length }} permisos</span>
        <span v-if="pendingCount" class="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">{{ pendingCount }} cambios pendientes</span>
        <slot name="actions" />
      </div>
    </div>
    <PermissionMatrixTable
      :loading="loading"
      :permissions="permissions"
      :grouped-permissions="groupedPermissions"
      :roles="roles"
      :role-labels="roleLabels"
      :role-badge-classes="roleBadgeClasses"
      :module-labels="moduleLabels"
      :plans-for-module="plansForModule"
      :local-matrix="localMatrix"
      :disabled-columns="disabledColumns"
      @toggle="(id, role, granted) => $emit('toggle', id, role, granted)"
      @delete="perm => $emit('delete', perm)"
    />
  </section>
</template>

<script setup lang="ts">
import { ShieldCheckIcon } from '@heroicons/vue/24/outline'
import PermissionMatrixTable from './PermissionMatrixTable.vue'

type PermissionRow = {
  id: string; key: string; module: string; action: string; label: string
  description?: string; isSystem: boolean
}
type PlanInfo = { id: string; name: string; color: string; enabledModules: string[] }

defineProps<{
  loading: boolean
  permissions: PermissionRow[]
  groupedPermissions: Record<string, PermissionRow[]>
  roles: string[]
  roleLabels: Record<string, string>
  roleBadgeClasses: Record<string, string>
  moduleLabels: Record<string, string>
  plansForModule: Record<string, PlanInfo[]>
  localMatrix: Record<string, Record<string, boolean>>
  disabledColumns?: string[]
  pendingCount: number
}>()

defineEmits<{
  toggle: [permissionId: string, role: string, granted: boolean]
  delete: [permission: PermissionRow]
}>()
</script>
