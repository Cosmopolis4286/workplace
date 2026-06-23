export default defineNuxtPlugin(() => {
  const { ensureSessionVerified } = useAuth()
  ensureSessionVerified().catch(() => {})
})
