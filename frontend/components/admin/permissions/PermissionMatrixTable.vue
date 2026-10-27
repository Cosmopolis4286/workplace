<template>
  <div>
    <!-- Loading skeleton -->
    <div v-if="loading && permissions.length === 0" class="space-y-2">
      <div v-for="i in 12" :key="i" class="h-10 bg-gray-200 rounded-lg animate-pulse"/>
    </div>

    <!-- Permission Matrix Table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-semibold text-gray-700 min-w-[240px]">Permiso</th>
              <th class="text-left px-4 py-3 font-semibold text-gray-700 w-28">Módulo</th>
              <th
                v-for="r in roles"
                :key="r"
                class="text-center px-4 py-3 font-semibold text-gray-700 w-28"
              >
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="roleBadgeClasses[r]"
                >
                  {{ roleLabels[r] }}
                </span>
              </th>
              <th class="w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="(group, module) in groupedPermissions" :key="module">
              <!-- Module header row -->
              <tr class="bg-gradient-to-r from-gray-50 to-gray-50/50">
                <td :colspan="2 + roles.length" class="px-4 py-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="w-2 h-2 rounded-full bg-red-500 shrink-0"/>
                    <span class="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {{ moduleLabels[module] ?? module }}
                    </span>
                    <span class="text-xs text-gray-400">({{ group.length }})</span>
                    <!-- Plan badges -->
                    <div v-if="plansForModule[module]?.length" class="flex items-center gap-1 ml-2">
                      <span class="text-xs text-gray-400 mr-0.5">Planes:</span>
                      <span
                        v-for="plan in plansForModule[module]"
                        :key="plan.id"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white leading-none"
                        :style="{ backgroundColor: plan.color }"
                        :title="`Módulo incluido en plan ${plan.name}`"
                      >{{ plan.name }}</span>
                    </div>
                    <span v-else class="text-[10px] text-gray-300 ml-2 italic">Sin plan</span>
                  </div>
                </td>
              </tr>
              <!-- Permission rows -->
              <tr
                v-for="perm in group"
                :key="perm.id"
                class="hover:bg-gray-50/80 transition-colors"
                :class="{ 'opacity-60': perm.isSystem }"
              >
                <td class="px-4 py-3">
                  <div class="flex items-start gap-2">
                    <svg
                      v-if="perm.isSystem"
                      class="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    <div>
                      <div class="font-medium text-gray-800">{{ perm.label }}</div>
                      <div class="text-xs text-gray-400 font-mono mt-0.5">{{ perm.key }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-500 capitalize text-xs">{{ perm.module }}</td>
                <td
                  v-for="r in roles"
                  :key="r"
                  class="text-center px-4 py-3"
                >
                  <input
                    type="checkbox"
                    :checked="localMatrix[perm.id]?.[r] ?? false"
                    :disabled="perm.isSystem || r === disabledColumnKey"
                    @change="$emit('toggle', perm.id, r, ($event.target as HTMLInputElement).checked)"
                    class="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 focus:ring-2
                           disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    :title="perm.isSystem ? 'Permiso de sistema — no editable' : r === disabledColumnKey ? 'Este rol siempre tiene todos los permisos' : ''"
                  />
                </td>
                <!-- Delete action -->
                <td class="px-3 py-3 text-center">
                  <button
                    v-if="!perm.isSystem"
                    @click="$emit('delete', perm)"
                    class="text-gray-300 hover:text-red-500 transition-colors"
                    title="Eliminar permiso"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && permissions.length === 0" class="text-center py-16 text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
        <p class="font-medium">No hay permisos cargados</p>
        <p class="text-sm mt-1">Ejecuta el seeder del backend para inicializar la matriz</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// `Role` es genérico a propósito (string, no el enum literal): este mismo
// componente se reutiliza tanto para la matriz por Role de RBAC
// (SUPERADMIN/ADMIN/PROFESIONAL/NORMAL) como para la matriz por
// UserProfile (BUSINESS/PROFESSIONAL_FREELANCER/PROFESSIONAL_SERVICE_PROVIDER)
// — ver permissions.vue.
type Role = string

interface PermissionRow {
  id: string
  key: string
  module: string
  action: string
  label: string
  description?: string
  isSystem: boolean
  // Sin roles/profiles: el estado de cada casilla viene de localMatrix, así
  // las filas de ambas matrices (por Role y por perfil) encajan.
}

interface PlanInfo { id: string; name: string; color: string; enabledModules: string[] }

defineProps<{
  loading: boolean
  permissions: PermissionRow[]
  groupedPermissions: Record<string, PermissionRow[]>
  roles: Role[]
  roleLabels: Record<Role, string>
  roleBadgeClasses: Record<Role, string>
  moduleLabels: Record<string, string>
  plansForModule: Record<string, PlanInfo[]>
  localMatrix: Record<string, Record<Role, boolean>>
  disabledColumnKey?: Role
}>()

defineEmits<{
  toggle: [permissionId: string, role: Role, granted: boolean]
  delete: [perm: PermissionRow]
}>()
</script>
