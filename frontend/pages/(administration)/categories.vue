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
    </div>

    <UserCategoriesTab v-if="can('users:view')" v-show="activeTab === 'usuarios'" />

    <GlobalCategoriesTab v-if="can('categories_global:view')" v-show="activeTab === 'globales'" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TagIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import UserCategoriesTab from '~/components/admin/categories/UserCategoriesTab.vue'
import GlobalCategoriesTab from '~/components/admin/categories/GlobalCategoriesTab.vue'

definePageMeta({ middleware: 'auth' })

const { can } = usePermissions()

const activeTab = ref<'usuarios' | 'globales'>('usuarios')

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
