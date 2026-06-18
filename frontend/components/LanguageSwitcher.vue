<template>
  <div class="flex items-center gap-1 text-xs">
    <button
      v-for="lang in availableLocales"
      :key="lang.code"
      type="button"
      class="px-2 py-1 rounded-md font-semibold transition-colors duration-150"
      :class="locale === lang.code ? 'bg-workplace-red/10 text-workplace-red' : 'text-gray-400 hover:text-gray-600'"
      @click="setLocale(lang.code)"
    >
      {{ lang.code.toUpperCase() }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const availableLocales = computed(() =>
  (locales.value as Array<{ code: string; name?: string }>).map((l) => ({ code: l.code, name: l.name }))
)
</script>
