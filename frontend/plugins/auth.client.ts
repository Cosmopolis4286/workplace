export default defineNuxtPlugin(() => {
  const { fetchProfile, isAuthenticated } = useAuth()

  if (isAuthenticated.value) {
    fetchProfile().catch(() => {})
  }
})
