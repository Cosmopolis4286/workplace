<template>
  <ProfilePublicView :initial-username="username" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProfilePublicView from '~/components/profile/ProfilePublicView.vue'

definePageMeta({ layout: false })

const route = useRoute()
const username = computed(() => route.params.username as string)
</script>
