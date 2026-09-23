<template>
  <div>
    <PageHeader
      title="Categorías"
      description="Gestiona las categorías de usuarios y del marketplace"
      :icon="TagIcon"
    />

    <!-- Tabs -->
    <div class="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
      <button
        v-if="can('users:view')"
        @click="activeTab = 'usuarios'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'usuarios' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        🏷️ Usuarios
      </button>
      <button
        v-if="can('categories_global:view')"
        @click="activeTab = 'globales'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'globales' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        🌍 Marketplace
      </button>
      <button
        v-if="isSuperAdminOrAdmin"
        @click="activeTab = 'servicios'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'servicios' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        🧰 Servicios
      </button>
      <button
        v-if="isSuperAdminOrAdmin"
        @click="activeTab = 'empleos'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'empleos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        💼 Empleos
      </button>
    </div>

    <UserCategoriesTab v-if="can('users:view')" v-show="activeTab === 'usuarios'" />

    <GlobalCategoriesTab v-if="can('categories_global:view')" v-show="activeTab === 'globales'" />

    <!-- Categorías de servicio/empleo: gateado por rol (SUPERADMIN/ADMIN),
         mismo criterio que el backend (services.controller.ts / jobs.controller.ts
         usan @Roles directo acá, no un permission key granular). -->
    <CatalogCategoriesTab v-if="isSuperAdminOrAdmin" v-show="activeTab === 'servicios'" kind="services" />
    <CatalogCategoriesTab v-if="isSuperAdminOrAdmin" v-show="activeTab === 'empleos'" kind="jobs" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TagIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import UserCategoriesTab from '~/components/admin/categories/UserCategoriesTab.vue'
import GlobalCategoriesTab from '~/components/admin/categories/GlobalCategoriesTab.vue'
import CatalogCategoriesTab from '~/components/admin/categories/CatalogCategoriesTab.vue'

definePageMeta({ middleware: 'auth' })

const { can } = usePermissions()
const { user } = useAuth()

// services.controller.ts / jobs.controller.ts gatean su CRUD admin con
// @Roles(SUPERADMIN, ADMIN) directo, sin permission key granular — se
// refleja el mismo criterio acá en vez de inventar un `can()` que el
// backend no respalda.
const isSuperAdminOrAdmin = computed(() => user.value?.role === 'SUPERADMIN' || user.value?.role === 'ADMIN')

const activeTab = ref<'usuarios' | 'globales' | 'servicios' | 'empleos'>('usuarios')

onMounted(() => {
  // Load the tab the user has permission for, defaulting to 'usuarios'
  if (!can('users:view') && can('categories_global:view')) {
    activeTab.value = 'globales'
  }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
