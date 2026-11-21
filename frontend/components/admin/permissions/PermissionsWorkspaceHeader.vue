<template>
  <section class="relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div class="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-red-50/80 to-transparent" />
    <div class="relative flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex min-w-0 items-start gap-4">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-workplace-red ring-1 ring-red-100">
          <component :is="icon" class="h-6 w-6" />
        </div>
        <div class="min-w-0">
          <nav v-if="breadcrumb?.length" aria-label="Migas de pan" class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-400">
            <template v-for="(item, index) in breadcrumb" :key="item.label">
              <NuxtLink v-if="item.to" :to="item.to" class="transition hover:text-workplace-red">{{ item.label }}</NuxtLink>
              <span v-else :class="index === breadcrumb.length - 1 ? 'text-gray-500' : ''">{{ item.label }}</span>
              <span v-if="index < breadcrumb.length - 1" aria-hidden="true">/</span>
            </template>
          </nav>
          <p class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-workplace-red">Administración · Control de acceso</p>
          <h1 class="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">{{ title }}</h1>
          <p class="mt-1 max-w-3xl text-sm leading-6 text-gray-500">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="stats?.length" class="grid grid-cols-2 divide-x divide-y divide-gray-100 border-t border-gray-100 bg-gray-50/70 sm:grid-cols-4 sm:divide-y-0">
      <div v-for="stat in stats" :key="stat.label" class="px-4 py-3 sm:px-5">
        <p class="text-lg font-bold tabular-nums text-gray-900">{{ stat.value }}</p>
        <p class="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{{ stat.label }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon: object | Function
  breadcrumb?: Array<{ label: string; to?: string }>
  stats?: Array<{ label: string; value: string | number }>
}>()
</script>
