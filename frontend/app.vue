<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <PwaPrompt />
    <AppLockScreen />
  </div>
</template>

<script setup>
// Meta tags para móvil
useHead({
  title: 'WorkPlace Manager',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'WorkPlace' },
    { name: 'application-name', content: 'WorkPlace' },
    { name: 'msapplication-TileColor', content: '#3b82f6' },
    { name: 'theme-color', content: '#3b82f6' }
  ],
  link: [
    { rel: 'apple-touch-icon', sizes: '192x192', href: '/icon-192.png' },
    { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icon-512.png' }
  ]
})
</script>
