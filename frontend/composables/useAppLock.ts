import { ref } from 'vue'

// Estado global reactivo compartido entre el plugin app-lock y AppLockScreen
const isLocked = ref(false)

export function useAppLock() {
  function lock(): void {
    isLocked.value = true
  }

  function unlock(): void {
    isLocked.value = false
  }

  return { isLocked, lock, unlock }
}
