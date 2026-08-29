<template>
  <div v-if="loading" class="max-w-4xl mx-auto px-4 py-6">
    <div class="card-premium p-6 animate-pulse flex gap-6">
      <div class="h-28 w-28 rounded-full bg-gray-200 flex-shrink-0" />
      <div class="flex-1 space-y-3 pt-2">
        <div class="h-6 bg-gray-200 rounded w-40" />
        <div class="h-4 bg-gray-200 rounded w-24" />
      </div>
    </div>
  </div>

  <div v-else-if="!resolvedUsername" class="max-w-4xl mx-auto px-4 py-6">
    <div class="card-premium p-12 text-center">
      <div class="text-5xl mb-4">😕</div>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Perfil no encontrado</h2>
      <p class="text-gray-500 mb-6">Este perfil profesional no existe o el link ya no está disponible.</p>
      <NuxtLink to="/" class="inline-flex items-center gap-2 px-5 py-2.5 bg-workplace-red text-white rounded-xl font-semibold">
        Volver al inicio
      </NuxtLink>
    </div>
  </div>

  <ProfilePublicView v-else :initial-username="resolvedUsername" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import ProfilePublicView from '~/components/profile/ProfilePublicView.vue'
import { useApi } from '~/composables/core/useApi'

definePageMeta({ layout: false })

const route = useRoute()
const { get } = useApi()

const slug = computed(() => route.params.slug as string)
const resolvedUsername = ref<string | null>(null)
const loading = ref(true)

async function resolveSlug() {
  loading.value = true
  resolvedUsername.value = null
  try {
    const profile = await get<{ username?: string }>(`/profiles/pro/${encodeURIComponent(slug.value)}`)
    resolvedUsername.value = profile.username ?? null
  } catch {
    resolvedUsername.value = null
  } finally {
    loading.value = false
  }
}

onMounted(resolveSlug)
watch(slug, resolveSlug)
</script>
